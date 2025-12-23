// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ConfidentialZama} from "./ConfidentialZama.sol";

contract CZamaSwap is Ownable {
    uint256 public constant CZAMA_DECIMALS = 6;
    uint256 public constant CZAMA_PER_ETH = 1000;
    uint256 public constant CZAMA_UNITS_PER_ETH = CZAMA_PER_ETH * (10 ** CZAMA_DECIMALS); // 1e9

    ConfidentialZama public immutable czama;

    event Swapped(address indexed payer, address indexed recipient, uint256 ethInWei, uint64 czamaOutUnits);

    error CZamaSwapZeroOutput();
    error CZamaSwapAmountTooLarge();
    error CZamaSwapEthWithdrawFailed();

    constructor(address initialOwner, ConfidentialZama czama_) Ownable(initialOwner) {
        czama = czama_;
    }

    function quote(uint256 ethInWei) public pure returns (uint64 czamaOutUnits) {
        uint256 units = (ethInWei * CZAMA_UNITS_PER_ETH) / 1e18;
        if (units > type(uint64).max) revert CZamaSwapAmountTooLarge();
        czamaOutUnits = uint64(units);
    }

    function swap(address recipient) public payable returns (uint64 czamaOutUnits) {
        czamaOutUnits = quote(msg.value);
        if (czamaOutUnits == 0) revert CZamaSwapZeroOutput();

        czama.mint(recipient, czamaOutUnits);
        emit Swapped(msg.sender, recipient, msg.value, czamaOutUnits);
    }

    function swap() external payable returns (uint64 czamaOutUnits) {
        return swap(msg.sender);
    }

    receive() external payable {
        swap(msg.sender);
    }

    function withdrawETH(address payable to, uint256 amountWei) external onlyOwner {
        (bool ok, ) = to.call{value: amountWei}("");
        if (!ok) revert CZamaSwapEthWithdrawFailed();
    }
}

