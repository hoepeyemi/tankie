// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BlastLeaderboard {
    struct PlayerStats {
        uint256 totalKills;
        uint256 totalDeaths;
        uint256 totalXP;
        uint256 matchesPlayed;
    }

    mapping(address => PlayerStats) public players;
    address[] public playerList;
    mapping(address => bool) private isRegistered;

    event ScoreSubmitted(
        address indexed player,
        uint256 kills,
        uint256 deaths,
        uint256 xp,
        uint256 totalKills,
        uint256 totalDeaths,
        uint256 totalXP,
        uint256 matchesPlayed
    );

    /// @notice Submit match results. Adds to cumulative stats for msg.sender.
    function submitScore(uint256 kills, uint256 deaths, uint256 xp) external {
        if (!isRegistered[msg.sender]) {
            playerList.push(msg.sender);
            isRegistered[msg.sender] = true;
        }

        PlayerStats storage stats = players[msg.sender];
        stats.totalKills += kills;
        stats.totalDeaths += deaths;
        stats.totalXP += xp;
        stats.matchesPlayed += 1;

        emit ScoreSubmitted(
            msg.sender,
            kills,
            deaths,
            xp,
            stats.totalKills,
            stats.totalDeaths,
            stats.totalXP,
            stats.matchesPlayed
        );
    }

    /// @notice Get stats for a specific player.
    function getPlayerStats(address player) external view returns (
        uint256 totalKills,
        uint256 totalDeaths,
        uint256 totalXP,
        uint256 matchesPlayed
    ) {
        PlayerStats memory s = players[player];
        return (s.totalKills, s.totalDeaths, s.totalXP, s.matchesPlayed);
    }

    /// @notice Get total number of registered players.
    function getPlayerCount() external view returns (uint256) {
        return playerList.length;
    }

    /// @notice Get a batch of player addresses (for pagination).
    function getPlayerBatch(uint256 start, uint256 count) external view returns (address[] memory) {
        uint256 end = start + count;
        if (end > playerList.length) {
            end = playerList.length;
        }
        address[] memory batch = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            batch[i - start] = playerList[i];
        }
        return batch;
    }

    /// @notice Get top players sorted by XP (returns up to `count` players).
    /// @dev Simple on-chain sort. Fine for small player counts (<1000).
    function getTopPlayers(uint256 count) external view returns (
        address[] memory addresses,
        uint256[] memory kills,
        uint256[] memory deaths,
        uint256[] memory xps,
        uint256[] memory matches
    ) {
        uint256 total = playerList.length;
        if (count > total) count = total;

        // Copy all into memory
        address[] memory allAddrs = new address[](total);
        uint256[] memory allXP = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            allAddrs[i] = playerList[i];
            allXP[i] = players[playerList[i]].totalXP;
        }

        // Simple selection sort for top N
        for (uint256 i = 0; i < count; i++) {
            uint256 maxIdx = i;
            for (uint256 j = i + 1; j < total; j++) {
                if (allXP[j] > allXP[maxIdx]) {
                    maxIdx = j;
                }
            }
            if (maxIdx != i) {
                (allAddrs[i], allAddrs[maxIdx]) = (allAddrs[maxIdx], allAddrs[i]);
                (allXP[i], allXP[maxIdx]) = (allXP[maxIdx], allXP[i]);
            }
        }

        // Build result arrays
        addresses = new address[](count);
        kills = new uint256[](count);
        deaths = new uint256[](count);
        xps = new uint256[](count);
        matches = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            addresses[i] = allAddrs[i];
            PlayerStats memory s = players[allAddrs[i]];
            kills[i] = s.totalKills;
            deaths[i] = s.totalDeaths;
            xps[i] = s.totalXP;
            matches[i] = s.matchesPlayed;
        }
    }
}
