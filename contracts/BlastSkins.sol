// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlastSkins
 * @notice Simple registry for unlocking premium tank skins.
 *         Players pay 15 $BLAST to unlock a specific skin forever.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
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

contract BlastSkins is SomniaEventHandler {
    IERC20 public immutable blastToken;
    address public immutable treasury;

    // Mapping: skinId -> current raw price
    mapping(string => uint256) public basePrices;
    mapping(string => uint256) public currentPrices;
    mapping(string => uint256) public lastPurchaseTime;
    
    // Mapping: player address => skin ID => whether they own it
    mapping(address => mapping(string => bool)) public hasSkin;

    event SkinUnlocked(address indexed player, string skinId);
    event PriceUpdated(string skinId, uint256 newPrice);

    constructor(address _blastToken, address _treasury) {
        blastToken = IERC20(_blastToken);
        treasury = _treasury;

        // Initialize base prices for the premium skins
        basePrices["military"] = 5 * 10**18;
        basePrices["studystorm"] = 10 * 10**18;
        basePrices["weeb"] = 25 * 10**18;
        basePrices["thomas"] = 50 * 10**18;
        
        currentPrices["military"] = 5 * 10**18;
        currentPrices["studystorm"] = 10 * 10**18;
        currentPrices["weeb"] = 25 * 10**18;
        currentPrices["thomas"] = 50 * 10**18;
    }

    /**
     * @notice Get the live dynamic price with time decay factored in
     */
    function getSkinPrice(string memory skinId) public view returns (uint256) {
        uint256 current = currentPrices[skinId];
        if (current == 0) return 0; // Invalid skin

        uint256 base = basePrices[skinId];
        uint256 lastPurchase = lastPurchaseTime[skinId];
        
        if (lastPurchase == 0) return current;

        // Decrease price by 1% of the base price per hour since last purchase
        uint256 hoursPassed = (block.timestamp - lastPurchase) / 3600;
        
        uint256 decay = (base * 1 / 100) * hoursPassed;

        if (current > decay && (current - decay) > base) {
            return current - decay;
        } else {
            return base; // Never drop below base price
        }
    }

    /**
     * @notice Purchase a premium skin for its dynamic price
     * @param skinId The ID of the skin
     */
    function buySkin(string calldata skinId) external {
        require(!hasSkin[msg.sender][skinId], "Skin already owned");

        uint256 price = getSkinPrice(skinId);
        require(price > 0, "Invalid skin");

        // Transfer $BLAST from the player to the treasury
        require(blastToken.transferFrom(msg.sender, treasury, price), "Payment failed");

        hasSkin[msg.sender][skinId] = true;
        
        // Ensure price internal state matches the purchase state
        currentPrices[skinId] = price;
        lastPurchaseTime[skinId] = block.timestamp;
        
        emit SkinUnlocked(msg.sender, skinId);
    }

    /**
     * @notice Somnia Reactivity handler
     * Increases price by 5% when a skin is bought
     */
    function _onEvent(
        address /* emitter */,
        bytes32[] calldata /* eventTopics */,
        bytes calldata data
    ) internal override {
        string memory skinId = abi.decode(data, (string));

        uint256 current = getSkinPrice(skinId);
        if (current == 0) return;

        // Increase price by 5% for the next buyer
        uint256 newPrice = current + (current * 5 / 100);
        currentPrices[skinId] = newPrice;
        
        emit PriceUpdated(skinId, newPrice);
    }
}
