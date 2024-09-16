import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { create, IPFSHTTPClient } from "ipfs-http-client";
import {
  Metaplex,
  keypairIdentity,
  irysStorage,
  CreateNftInput,
  NftWithToken,
  UploadMetadataInput,
} from "@metaplex-foundation/js";
import { Buffer } from "buffer";

const NETWORK_URL = "https://api.devnet.solana.com"; // Use devnet for testing
const IPFS_PROJECT_ID = "YOUR_INFURA_PROJECT_ID";
const IPFS_PROJECT_SECRET = "YOUR_INFURA_PROJECT_SECRET";

const ipfs: IPFSHTTPClient = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization:
      "Basic " +
      Buffer.from(IPFS_PROJECT_ID + ":" + IPFS_PROJECT_SECRET).toString(
        "base64"
      ),
  },
});

interface NFTMetadata extends UploadMetadataInput {
  [key: string]: any;
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

export async function mintNFT(
  wallet: Keypair,
  imageUri: string,
  latitude: number,
  longitude: number
): Promise<string> {
  const connection = new Connection(NETWORK_URL, "confirmed");

  // Create a new mint
  const mint: PublicKey = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    0 // 0 decimals for NFT
  );

  // Get the token account of the wallet address, and if it does not exist, create it
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey
  );

  // Mint 1 new token to the "tokenAccount" account we just created
  await mintTo(connection, wallet, mint, tokenAccount.address, wallet, 1);

  // Upload image to IPFS
  const imageResponse: Response = await fetch(imageUri);
  const imageBlob: Blob = await imageResponse.blob();
  const imageBuffer: Buffer = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(Buffer.from(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(imageBlob);
  });
  const imageResult = await ipfs.add(imageBuffer);
  const imageUrl = `https://ipfs.io/ipfs/${imageResult.path}`;

  // Create metadata
  const metadata: NFTMetadata = {
    name: "My NFT",
    symbol: "MNFT",
    description: "An NFT created with a camera and geolocation",
    image: imageUrl,
    attributes: [
      {
        trait_type: "Latitude",
        value: latitude.toString(),
      },
      {
        trait_type: "Longitude",
        value: longitude.toString(),
      },
    ],
  };

  // Initialize Metaplex with Irys storage
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(wallet))
    .use(
      irysStorage({
        address: "https://devnet.irys.xyz",
        providerUrl: NETWORK_URL,
        timeout: 60000,
      })
    );

  // Upload metadata and create NFT using Metaplex
  const { uri } = await metaplex.nfts().uploadMetadata(metadata);

  const nftInput: CreateNftInput = {
    uri,
    name: metadata.name,
    sellerFeeBasisPoints: 500, // 5% royalty
    tokenOwner: wallet.publicKey,
  };

  const { nft } = await metaplex.nfts().create(nftInput);

  console.log("NFT minted:", nft.address.toBase58());
  console.log("Metadata:", metadata);
  console.log("Metadata URL:", uri);

  return nft.address.toBase58();
}
