// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AINFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    uint256 public mintPrice = 0.01 ether;
    
    constructor() ERC721("AI Generated NFT", "AINFT") Ownable(msg.sender) {}

    function safeMint(address to, string memory uri) public payable {
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Admin functions
    function setMintPrice(uint256 newPrice) public onlyOwner {
        mintPrice = newPrice;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
} 