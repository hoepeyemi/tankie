// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlastWager
 * @notice Somnia Reactivity handler for High-Stakes Wager Matches.
 *         Acts as an escrow for $BLAST tokens and a Reactivity handler
 *         to auto-distribute the pot based on submitted match scores.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

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

contract BlastWager is SomniaEventHandler {
    IERC20 public immutable blastToken;

    struct Room {
        uint256 wagerAmount;
        address player1;
        address player2;
        bool active;
        uint256 pot;
        bool p1Submitted;
        bool p2Submitted;
        uint256 p1Kills;
        uint256 p2Kills;
    }

    // Mapping from roomId (string converted to bytes32) to Room details
    mapping(bytes32 => Room) public rooms;

    // Event emitted when a player submits their score for a wager match.
    // The contract listens to ITS OWN events for Reactivity.
    event WagerScoreSubmitted(
        bytes32 indexed roomId,
        address indexed player,
        uint256 kills
    );

    event RoomCreated(bytes32 indexed roomId, address indexed host, uint256 wagerAmount);
    event RoomJoined(bytes32 indexed roomId, address indexed guest);
    event WagerPayout(bytes32 indexed roomId, address winner, uint256 amount);
    event WagerDraw(bytes32 indexed roomId, uint256 refundAmount);

    constructor(address _blastToken) {
        blastToken = IERC20(_blastToken);
    }

    /**
     * @notice Host a new wager match room
     * @param roomIdStr The 6-character room code from the frontend
     * @param wagerAmount The amount of $BLAST to wager (must be approved first)
     */
    function hostRoom(string calldata roomIdStr, uint256 wagerAmount) external {
        bytes32 roomId = keccak256(abi.encodePacked(roomIdStr));
        require(!rooms[roomId].active, "Room already exists or active");
        require(wagerAmount > 0, "Wager must be > 0");

        // Transfer wager from host to this contract
        require(blastToken.transferFrom(msg.sender, address(this), wagerAmount), "Transfer failed");

        rooms[roomId] = Room({
            wagerAmount: wagerAmount,
            player1: msg.sender,
            player2: address(0),
            active: true,
            pot: wagerAmount,
            p1Submitted: false,
            p2Submitted: false,
            p1Kills: 0,
            p2Kills: 0
        });

        emit RoomCreated(roomId, msg.sender, wagerAmount);
    }

    /**
     * @notice Join an existing wager match room
     * @param roomIdStr The 6-character room code
     */
    function joinRoom(string calldata roomIdStr) external {
        bytes32 roomId = keccak256(abi.encodePacked(roomIdStr));
        Room storage room = rooms[roomId];

        require(room.active, "Room not active");
        require(room.player2 == address(0), "Room is full");
        require(msg.sender != room.player1, "Host cannot join own room");

        // Transfer wager from guest to this contract
        require(blastToken.transferFrom(msg.sender, address(this), room.wagerAmount), "Transfer failed");

        room.player2 = msg.sender;
        room.pot += room.wagerAmount;

        emit RoomJoined(roomId, msg.sender);
    }

    /**
     * @notice Submit your score at the end of the wager match
     * @param roomIdStr The room code
     * @param kills Note: Trusting clients for a demo. In prod, logic runs in TEE/ZK.
     */
    function submitScore(string calldata roomIdStr, uint256 kills) external {
        bytes32 roomId = keccak256(abi.encodePacked(roomIdStr));
        Room storage room = rooms[roomId];

        require(room.active, "Room not active");
        require(room.player2 != address(0), "Match never started");

        if (msg.sender == room.player1) {
            require(!room.p1Submitted, "Already submitted");
            room.p1Submitted = true;
            room.p1Kills = kills;
        } else if (msg.sender == room.player2) {
            require(!room.p2Submitted, "Already submitted");
            room.p2Submitted = true;
            room.p2Kills = kills;
        } else {
            revert("You are not in this room");
        }

        emit WagerScoreSubmitted(roomId, msg.sender, kills);
    }

    /**
     * @notice Reactivity Handler invoked by Somnia Validators.
     *         Listens to WagerScoreSubmitted from THIS contract.
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata /* data */
    ) internal override {
        // Only react to events emitted by ourselves
        require(emitter == address(this), "Ignoring external events");

        // Extract topics & data
        // event WagerScoreSubmitted(bytes32 indexed roomId, address indexed player, uint256 kills)
        bytes32 roomId = eventTopics[1];
        // address player = address(uint160(uint256(eventTopics[2]))); // Not strictly needed here

        // uint256 kills = abi.decode(data, (uint256)); // Variable not used locally, stored in state

        // Let's resolve the match if both players have submitted
        Room storage room = rooms[roomId];
        
        // This function will be called twice (once for p1, once for p2).
        // Only trigger payout when BOTH are submitted.
        if (room.p1Submitted && room.p2Submitted && room.active) {
            _resolveMatch(roomId);
        }
    }

    /**
     * @dev Determines winner and sweeps the pot.
     */
    function _resolveMatch(bytes32 roomId) private {
        Room storage room = rooms[roomId];
        require(room.active, "Already resolved");

        room.active = false; // Prevent re-entrancy / double payout
        uint256 payout = room.pot;
        room.pot = 0;

        if (room.p1Kills > room.p2Kills) {
            require(blastToken.transfer(room.player1, payout), "Transfer failed");
            emit WagerPayout(roomId, room.player1, payout);
        } else if (room.p2Kills > room.p1Kills) {
            require(blastToken.transfer(room.player2, payout), "Transfer failed");
            emit WagerPayout(roomId, room.player2, payout);
        } else {
            // Draw - refund both
            uint256 refund = payout / 2;
            require(blastToken.transfer(room.player1, refund), "Refund p1 failed");
            require(blastToken.transfer(room.player2, refund), "Refund p2 failed");
            emit WagerDraw(roomId, refund);
        }
    }

    // Helper functions for frontend
    function getRoomDetails(string calldata roomIdStr) external view returns (uint256 amount, address p1, address p2, bool active) {
        bytes32 roomId = keccak256(abi.encodePacked(roomIdStr));
        Room storage room = rooms[roomId];
        return (room.wagerAmount, room.player1, room.player2, room.active);
    }
}
