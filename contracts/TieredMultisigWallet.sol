// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TieredMultisigWallet
 * @notice Shared-custody wallet with amount-tiered thresholds, large-tx cooldown/veto, and emergency pause.
 */
contract TieredMultisigWallet is ReentrancyGuard, Pausable {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error NotOwner();
    error NotGuardian();
    error OwnersRequired();
    error InvalidThreshold();
    error InvalidCooldown();
    error DuplicateOwner();
    error ZeroAddress();
    error TxDoesNotExist();
    error AlreadyConfirmed();
    error NotConfirmed();
    error AlreadyExecuted();
    error AlreadyVetoed();
    error InsufficientConfirmations();
    error CooldownNotElapsed();
    error VetoNotApplicable();
    error CannotVetoSmallTx();

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        bool vetoed;
        uint256 numConfirmations;
        uint256 cooldownEnd; // 0 = no cooldown (small tx or not yet armed)
        bool cooldownArmed;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    address[] public owners;
    mapping(address => bool) public isOwner;

    address[] public guardians;
    mapping(address => bool) public isGuardian;

    uint256 public smallThreshold;
    uint256 public largeThreshold;
    uint256 public largeAmountThreshold; // wei
    uint256 public cooldownPeriod; // seconds

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // Owner votes to unpause after a guardian pause
    mapping(address => bool) public unpauseVote;
    uint256 public unpauseVoteCount;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event CooldownArmed(uint256 indexed txIndex, uint256 cooldownEnd);
    event VetoTransaction(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event GuardianshipPause(address indexed guardian);
    event UnpauseVote(address indexed owner, uint256 voteCount);
    event UnpausedByOwners(uint256 voteCount);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------
    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }

    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        _;
    }

    modifier txExists(uint256 txIndex) {
        if (txIndex >= transactions.length) revert TxDoesNotExist();
        _;
    }

    modifier notExecuted(uint256 txIndex) {
        if (transactions[txIndex].executed) revert AlreadyExecuted();
        _;
    }

    modifier notVetoed(uint256 txIndex) {
        if (transactions[txIndex].vetoed) revert AlreadyVetoed();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    /**
     * @param _owners Multisig owner addresses (unique, non-zero)
     * @param _smallThreshold Confirmations required for transfers below largeAmountThreshold
     * @param _largeThreshold Confirmations required for large transfers
     * @param _largeAmountThreshold Amount (wei) at/above which large rules apply
     * @param _cooldownPeriod Seconds to wait after large tx reaches threshold before execute
     * @param _guardians Addresses allowed to emergency-pause (can overlap with owners)
     */
    constructor(
        address[] memory _owners,
        uint256 _smallThreshold,
        uint256 _largeThreshold,
        uint256 _largeAmountThreshold,
        uint256 _cooldownPeriod,
        address[] memory _guardians
    ) {
        if (_owners.length == 0) revert OwnersRequired();
        if (_smallThreshold == 0 || _smallThreshold > _owners.length) revert InvalidThreshold();
        if (_largeThreshold < _smallThreshold || _largeThreshold > _owners.length) {
            revert InvalidThreshold();
        }
        if (_largeAmountThreshold == 0) revert InvalidThreshold();
        if (_cooldownPeriod == 0) revert InvalidCooldown();

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            if (owner == address(0)) revert ZeroAddress();
            if (isOwner[owner]) revert DuplicateOwner();
            isOwner[owner] = true;
            owners.push(owner);
        }

        for (uint256 i = 0; i < _guardians.length; i++) {
            address g = _guardians[i];
            if (g == address(0)) revert ZeroAddress();
            if (!isGuardian[g]) {
                isGuardian[g] = true;
                guardians.push(g);
            }
        }

        smallThreshold = _smallThreshold;
        largeThreshold = _largeThreshold;
        largeAmountThreshold = _largeAmountThreshold;
        cooldownPeriod = _cooldownPeriod;
    }

    // -------------------------------------------------------------------------
    // Receive ETH
    // -------------------------------------------------------------------------
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getGuardians() external view returns (address[] memory) {
        return guardians;
    }

    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    function requiredConfirmations(uint256 value) public view returns (uint256) {
        return value >= largeAmountThreshold ? largeThreshold : smallThreshold;
    }

    function isLargeTransaction(uint256 value) public view returns (bool) {
        return value >= largeAmountThreshold;
    }

    function getTransaction(uint256 txIndex)
        external
        view
        txExists(txIndex)
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            bool vetoed,
            uint256 numConfirmations,
            uint256 cooldownEnd,
            bool cooldownArmed,
            uint256 required
        )
    {
        Transaction storage t = transactions[txIndex];
        return (
            t.to,
            t.value,
            t.data,
            t.executed,
            t.vetoed,
            t.numConfirmations,
            t.cooldownEnd,
            t.cooldownArmed,
            requiredConfirmations(t.value)
        );
    }

    function canExecute(uint256 txIndex) external view txExists(txIndex) returns (bool) {
        Transaction storage t = transactions[txIndex];
        if (t.executed || t.vetoed) return false;
        if (t.numConfirmations < requiredConfirmations(t.value)) return false;
        if (isLargeTransaction(t.value)) {
            if (!t.cooldownArmed) return false;
            if (block.timestamp < t.cooldownEnd) return false;
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // Core multisig
    // -------------------------------------------------------------------------
    function submitTransaction(address to, uint256 value, bytes calldata data)
        external
        onlyOwner
        whenNotPaused
        returns (uint256 txIndex)
    {
        if (to == address(0)) revert ZeroAddress();

        txIndex = transactions.length;
        transactions.push(
            Transaction({
                to: to,
                value: value,
                data: data,
                executed: false,
                vetoed: false,
                numConfirmations: 0,
                cooldownEnd: 0,
                cooldownArmed: false
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, to, value, data);
    }

    function confirmTransaction(uint256 txIndex)
        external
        onlyOwner
        whenNotPaused
        txExists(txIndex)
        notExecuted(txIndex)
        notVetoed(txIndex)
    {
        if (isConfirmed[txIndex][msg.sender]) revert AlreadyConfirmed();

        Transaction storage t = transactions[txIndex];
        isConfirmed[txIndex][msg.sender] = true;
        t.numConfirmations += 1;

        emit ConfirmTransaction(msg.sender, txIndex);

        _maybeArmCooldown(txIndex);
    }

    function revokeConfirmation(uint256 txIndex)
        external
        onlyOwner
        whenNotPaused
        txExists(txIndex)
        notExecuted(txIndex)
        notVetoed(txIndex)
    {
        if (!isConfirmed[txIndex][msg.sender]) revert NotConfirmed();

        Transaction storage t = transactions[txIndex];
        isConfirmed[txIndex][msg.sender] = false;
        t.numConfirmations -= 1;

        // If confirmations fall below large threshold, disarm cooldown
        if (t.cooldownArmed && t.numConfirmations < requiredConfirmations(t.value)) {
            t.cooldownArmed = false;
            t.cooldownEnd = 0;
        }

        emit RevokeConfirmation(msg.sender, txIndex);
    }

    /**
     * @notice Any owner may veto a large transaction during its cooldown window.
     */
    function vetoTransaction(uint256 txIndex)
        external
        onlyOwner
        whenNotPaused
        txExists(txIndex)
        notExecuted(txIndex)
        notVetoed(txIndex)
    {
        Transaction storage t = transactions[txIndex];
        if (!isLargeTransaction(t.value)) revert CannotVetoSmallTx();
        if (!t.cooldownArmed) revert VetoNotApplicable();
        if (block.timestamp >= t.cooldownEnd) revert VetoNotApplicable();

        t.vetoed = true;
        emit VetoTransaction(msg.sender, txIndex);
    }

    function executeTransaction(uint256 txIndex)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
        txExists(txIndex)
        notExecuted(txIndex)
        notVetoed(txIndex)
    {
        Transaction storage t = transactions[txIndex];
        uint256 required = requiredConfirmations(t.value);
        if (t.numConfirmations < required) revert InsufficientConfirmations();

        if (isLargeTransaction(t.value)) {
            if (!t.cooldownArmed) revert CooldownNotElapsed();
            if (block.timestamp < t.cooldownEnd) revert CooldownNotElapsed();
        }

        t.executed = true;

        (bool success, bytes memory returndata) = t.to.call{value: t.value}(t.data);
        if (!success) {
            // Bubble revert reason if present
            if (returndata.length > 0) {
                assembly {
                    revert(add(returndata, 32), mload(returndata))
                }
            }
            revert("Tx failed");
        }

        emit ExecuteTransaction(msg.sender, txIndex);
    }

    // -------------------------------------------------------------------------
    // Pause / Unpause
    // -------------------------------------------------------------------------
    function pause() external onlyGuardian {
        _pause();
        // Reset unpause votes
        _clearUnpauseVotes();
        emit GuardianshipPause(msg.sender);
    }

    function voteToUnpause() external onlyOwner {
        require(paused(), "Not paused");
        if (unpauseVote[msg.sender]) revert AlreadyConfirmed();

        unpauseVote[msg.sender] = true;
        unpauseVoteCount += 1;
        emit UnpauseVote(msg.sender, unpauseVoteCount);

        if (unpauseVoteCount >= largeThreshold) {
            _clearUnpauseVotes();
            _unpause();
            emit UnpausedByOwners(largeThreshold);
        }
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------
    function _maybeArmCooldown(uint256 txIndex) internal {
        Transaction storage t = transactions[txIndex];
        if (t.cooldownArmed || t.vetoed || t.executed) return;

        uint256 required = requiredConfirmations(t.value);
        if (t.numConfirmations < required) return;

        if (isLargeTransaction(t.value)) {
            t.cooldownArmed = true;
            t.cooldownEnd = block.timestamp + cooldownPeriod;
            emit CooldownArmed(txIndex, t.cooldownEnd);
        }
    }

    function _clearUnpauseVotes() internal {
        for (uint256 i = 0; i < owners.length; i++) {
            if (unpauseVote[owners[i]]) {
                unpauseVote[owners[i]] = false;
            }
        }
        unpauseVoteCount = 0;
    }
}
