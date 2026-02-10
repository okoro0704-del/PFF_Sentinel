// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VIDA Token
 * @dev ERC-20 token with custom minting logic for PFF Sentinel Protocol
 * Supports spendable and locked balances for the 5 VIDA CAP system
 */
contract VIDAToken is ERC20, Ownable {
    // Mapping from address to spendable balance
    mapping(address => uint256) private _spendableBalances;
    
    // Mapping from address to locked balance
    mapping(address => uint256) private _lockedBalances;
    
    // Mapping to track if address has received Sovereign Cap
    mapping(address => bool) private _sovereignCapMinted;
    
    // Events
    event SovereignCapMinted(address indexed recipient, uint256 spendable, uint256 locked);
    event TokensUnlocked(address indexed owner, uint256 amount);
    
    constructor() ERC20("VIDA Token", "VIDA") Ownable(msg.sender) {
        // Initial supply can be minted to owner if needed
        // _mint(msg.sender, 1000000 * 10 ** decimals());
    }
    
    /**
     * @dev Mint Sovereign Cap (5 VIDA) to recipient
     * @param recipient Address to receive the tokens
     * @param spendable Amount of spendable tokens (in wei, 18 decimals)
     * @param locked Amount of locked tokens (in wei, 18 decimals)
     * @return success True if minting was successful
     */
    function mintSovereignCap(
        address recipient,
        uint256 spendable,
        uint256 locked
    ) external onlyOwner returns (bool) {
        require(recipient != address(0), "VIDA: mint to zero address");
        require(!_sovereignCapMinted[recipient], "VIDA: Sovereign Cap already minted");
        require(spendable + locked > 0, "VIDA: total amount must be greater than 0");
        
        uint256 totalAmount = spendable + locked;
        
        // Mint total tokens
        _mint(recipient, totalAmount);
        
        // Set spendable and locked balances
        _spendableBalances[recipient] = spendable;
        _lockedBalances[recipient] = locked;
        
        // Mark as minted
        _sovereignCapMinted[recipient] = true;
        
        emit SovereignCapMinted(recipient, spendable, locked);
        
        return true;
    }
    
    /**
     * @dev Get spendable balance of an address
     * @param owner Address to query
     * @return Spendable balance
     */
    function getSpendableBalance(address owner) external view returns (uint256) {
        return _spendableBalances[owner];
    }
    
    /**
     * @dev Get locked balance of an address
     * @param owner Address to query
     * @return Locked balance
     */
    function getLockedBalance(address owner) external view returns (uint256) {
        return _lockedBalances[owner];
    }
    
    /**
     * @dev Check if address has received Sovereign Cap
     * @param owner Address to query
     * @return True if Sovereign Cap was minted
     */
    function hasSovereignCap(address owner) external view returns (bool) {
        return _sovereignCapMinted[owner];
    }
    
    /**
     * @dev Unlock tokens (move from locked to spendable)
     * @param owner Address to unlock tokens for
     * @param amount Amount to unlock (in wei)
     * @return success True if unlock was successful
     */
    function unlockTokens(address owner, uint256 amount) external onlyOwner returns (bool) {
        require(_lockedBalances[owner] >= amount, "VIDA: insufficient locked balance");
        
        _lockedBalances[owner] -= amount;
        _spendableBalances[owner] += amount;
        
        emit TokensUnlocked(owner, amount);
        
        return true;
    }
    
    /**
     * @dev Override transfer to only allow spending from spendable balance
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success True if transfer was successful
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        require(_spendableBalances[owner] >= amount, "VIDA: transfer amount exceeds spendable balance");
        
        // Deduct from spendable balance
        _spendableBalances[owner] -= amount;
        
        // Add to recipient's spendable balance
        _spendableBalances[to] += amount;
        
        // Execute standard ERC-20 transfer
        _transfer(owner, to, amount);
        
        return true;
    }
    
    /**
     * @dev Override transferFrom to only allow spending from spendable balance
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success True if transfer was successful
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        address spender = _msgSender();
        require(_spendableBalances[from] >= amount, "VIDA: transfer amount exceeds spendable balance");
        
        // Check allowance
        _spendAllowance(from, spender, amount);
        
        // Deduct from sender's spendable balance
        _spendableBalances[from] -= amount;
        
        // Add to recipient's spendable balance
        _spendableBalances[to] += amount;
        
        // Execute standard ERC-20 transfer
        _transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * @dev Burn tokens (only from spendable balance)
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        address owner = _msgSender();
        require(_spendableBalances[owner] >= amount, "VIDA: burn amount exceeds spendable balance");
        
        _spendableBalances[owner] -= amount;
        _burn(owner, amount);
    }
}

