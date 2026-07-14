// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlastRewarder
 * @notice Somnia Reactivity handler that auto-rewards $BLAST tokens when
 *         the BlastLeaderboard contract emits a ScoreSubmitted event.
 *         Chain validators invoke _onEvent() automatically — no backend needed.
 *
 * Flow: Player submits score → ScoreSubmitted event → Validators call this →
 *       $BLAST tokens transferred to the player's wallet.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Minimal SomniaEventHandler interface
// The full version comes from @somnia-chain/reactivity-contracts but
// we inline it here for easy Remix deployment.
abstract contract SomniaEventHandler {
    address constant SOMNIA_REACTIVITY_PRECOMPILE = 0x0000000000000000000000000000000000000100;

    function onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external {
        require(msg.sender == SOMNIA_REACTIVITY_PRECOMPILE, "Only precompile");
        _onEvent(emitter, eventTopics, data);
    }

    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal virtual;
}

contract BlastRewarder is SomniaEventHandler {
    IERC20 public immutable blastToken;
    address public owner;
    uint256 public tokensPerKill = 10 * 1e18; // 10 $BLAST per kill

    // Track total rewards distributed
    uint256 public totalRewardsDistributed;
    mapping(address => uint256) public playerRewards;

    event RewardSent(address indexed player, uint256 kills, uint256 reward);
    event TokensPerKillUpdated(uint256 oldRate, uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _blastToken) {
        blastToken = IERC20(_blastToken);
        owner = msg.sender;
    }

    /**
     * @notice Called by Somnia validators when ScoreSubmitted is emitted.
     * @dev Decodes the event, calculates reward, and transfers $BLAST.
     *
     * ScoreSubmitted event signature:
     *   event ScoreSubmitted(
     *     address indexed player,    // topic[1]
     *     uint256 kills,             // data[0]
     *     uint256 deaths,            // data[1]
     *     uint256 xp,               // data[2]
     *     uint256 totalKills,       // data[3]
     *     uint256 totalDeaths,      // data[4]
     *     uint256 totalXP,          // data[5]
     *     uint256 matchesPlayed     // data[6]
     *   );
     */
    function _onEvent(
        address /* emitter */,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Extract player address from indexed topic
        address player = address(uint160(uint256(eventTopics[1])));

        // Decode kills from the first uint256 in the data
        (uint256 kills, , , , , , ) = abi.decode(
            data,
            (uint256, uint256, uint256, uint256, uint256, uint256, uint256)
        );

        // Calculate reward
        uint256 reward = kills * tokensPerKill;
        if (reward == 0) return;

        // Check balance
        uint256 balance = blastToken.balanceOf(address(this));
        if (balance < reward) {
            // Send what we can if running low
            reward = balance;
        }
        if (reward == 0) return;

        // Transfer tokens to player
        blastToken.transfer(player, reward);

        // Track stats
        totalRewardsDistributed += reward;
        playerRewards[player] += reward;

        emit RewardSent(player, kills, reward);
    }

    /// @notice Owner can update the reward rate
    function setTokensPerKill(uint256 newRate) external onlyOwner {
        emit TokensPerKillUpdated(tokensPerKill, newRate);
        tokensPerKill = newRate;
    }

    /// @notice Owner can withdraw remaining tokens
    function withdrawTokens(uint256 amount) external onlyOwner {
        blastToken.transfer(owner, amount);
    }

    /// @notice Check how many tokens are available for rewards
    function availableRewards() external view returns (uint256) {
        return blastToken.balanceOf(address(this));
    }
}
