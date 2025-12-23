// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ConfidentialZama is ERC7984, ZamaEthereumConfig, Ownable {
    mapping(address minter => bool enabled) private _minters;

    event MinterUpdated(address indexed minter, bool enabled);

    error ConfidentialZamaNotMinter(address account);

    constructor(address initialOwner) ERC7984("cZama", "cZama", "") Ownable(initialOwner) {}

    function setMinter(address minter, bool enabled) external onlyOwner {
        _minters[minter] = enabled;
        emit MinterUpdated(minter, enabled);
    }

    function isMinter(address minter) external view returns (bool) {
        return _minters[minter];
    }

    function mint(address to, uint64 amount) external returns (euint64 mintedAmount) {
        if (!_minters[msg.sender]) {
            revert ConfidentialZamaNotMinter(msg.sender);
        }

        mintedAmount = _mint(to, FHE.asEuint64(amount));
        FHE.allow(mintedAmount, msg.sender);
    }
}
