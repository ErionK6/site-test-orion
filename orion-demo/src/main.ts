// src/main.ts
import "./style.css";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Buffer } from "buffer";

// Polyfill pour Buffer, nécessaire pour le navigateur
window.Buffer = Buffer;

// Importer l'IDL local. Vite le transformera en objet JSON.
import idl from "./idl.json";

// --- Configuration ---
const RPC_URL = "https://api.devnet.solana.com";
// On hardcode l'ID du programme, c'est plus sûr que de se fier à l'IDL.
const PROGRAM_ID = new anchor.web3.PublicKey(
  "orionDXd6giDNe3YfcuXhg2kK7gwy9DueaFSrdFNsaa"
);

// Définir un type pour notre programme basé sur l'IDL
// C'est mieux d'importer le type généré si on est dans un projet Anchor complet,
// mais pour une démo autonome, 'any' sur l'IDL est plus simple.
type OrionPdaNexus = anchor.Idl;

// --- Variables globales ---
let provider: anchor.AnchorProvider | null = null;
let program: anchor.Program<OrionPdaNexus> | null = null;

// --- Éléments du DOM ---
const connectButton = document.getElementById(
  "connectButton"
) as HTMLButtonElement;
const createButton = document.getElementById(
  "createButton"
) as HTMLButtonElement;
const revokeButton = document.getElementById(
  "revokeButton"
) as HTMLButtonElement;
const walletAddressElem = document.getElementById("walletAddress")!;
const walletInfoElem = document.getElementById("walletInfo")!;
const controlsElem = document.getElementById("controls")!;
const logsElem = document.getElementById("logs") as HTMLDivElement;

// --- Fonctions utilitaires ---
function log(message: string) {
  console.log(message);
  if (logsElem) {
    const time = new Date().toLocaleTimeString();
    const newLog = document.createElement("div");
    newLog.textContent = `[${time}] ${message}`;
    logsElem.prepend(newLog);
  }
}

// --- Logique principale de l'application ---
async function initializeApp(wallet: any) {
  walletAddressElem.textContent = wallet.publicKey.toString();
  walletInfoElem.classList.remove("hidden");
  controlsElem.classList.remove("hidden");
  connectButton.style.display = "none";
  log(`Wallet connecté: ${wallet.publicKey.toString()}`);

  const connection = new Connection(RPC_URL, "confirmed");
  const providerOptions: anchor.AnchorProvider.Options = {
    preflightCommitment: "processed",
    commitment: "confirmed",
  };
  provider = new anchor.AnchorProvider(connection, wallet, providerOptions);

  try {
    // CORRECTION : On caste l'IDL en 'any' car les types générés ne sont pas importés.
    // C'est la manière la plus courante et la plus simple dans une app frontend légère.
    program = new anchor.Program(idl as any, provider);
    log("Programme initialisé avec succès.");
    if (createButton) createButton.disabled = false;
    if (revokeButton) revokeButton.disabled = false;
  } catch (e: any) {
    log(`Erreur critique lors de l'initialisation du programme: ${e.message}`);
    alert(`Erreur critique: ${e.message}`);
  }
}

function handleDisconnect() {
  log("Wallet déconnecté.");
  walletAddressElem.textContent = "Non connecté";
  walletInfoElem.classList.add("hidden");
  controlsElem.classList.add("hidden");
  connectButton.style.display = "block";
  provider = null;
  program = null;
}

// --- Gestionnaires d'événements ---
window.addEventListener("load", () => {
  log("Page chargée. Vérification du wallet Phantom...");
  const phantom = (window as any).solana;
  if (phantom && phantom.isPhantom) {
    log("Wallet Phantom détecté.");
    if (phantom.isConnected) {
      initializeApp(phantom);
    }
    phantom.on("connect", () => initializeApp(phantom));
    phantom.on("disconnect", handleDisconnect);
  } else {
    log("Wallet Phantom non détecté. Pensez à l'installer.");
  }
});

if (connectButton) {
  connectButton.onclick = async () => {
    const phantom = (window as any).solana;
    if (phantom && phantom.isPhantom) {
      try {
        await phantom.connect({ onlyIfTrusted: false });
      } catch (err) {
        log(`Erreur de connexion: ${err.message}`);
      }
    } else {
      window.open("https://phantom.app/", "_blank");
    }
  };
}

if (createButton) {
  createButton.onclick = async () => {
    if (!provider || !program) {
      log("Veuillez d'abord connecter votre wallet.");
      return;
    }
    log("Préparation de la transaction initializeDelegation...");
    createButton.disabled = true;

    try {
      const delegationId = new anchor.BN(
        (document.getElementById("delegationId") as HTMLInputElement).value
      );
      const solToWrap = new anchor.BN(
        parseFloat(
          (document.getElementById("solToWrap") as HTMLInputElement).value
        ) * LAMPORTS_PER_SOL
      );
      const botPubkey = new anchor.web3.PublicKey(
        (document.getElementById("botPubkey") as HTMLInputElement).value
      );

      const initialPriorityFee = new anchor.BN(1000);
      const initialAmountPerTrade = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
      const userPubkey = provider.wallet.publicKey;

      const [orionDelegationPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("orion_delegation"),
          userPubkey.toBuffer(),
          delegationId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
      const userWsolAta = getAssociatedTokenAddressSync(
        NATIVE_MINT,
        userPubkey
      );
      const [programStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("orion_state")],
        program.programId
      );

      // On utilise la signature de la méthode depuis l'IDL
      const txSignature = await program.methods
        .initializeDelegation(
          delegationId,
          solToWrap,
          initialPriorityFee,
          initialAmountPerTrade,
          botPubkey
        )
        .accounts({
          user: userPubkey,
          orionDelegation: orionDelegationPda,
          wsolMint: NATIVE_MINT,
          userWsolAccount: userWsolAta,
          orionPda: orionDelegationPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          programState: programStatePda,
        })
        .rpc();

      log(`Transaction envoyée ! Signature: ${txSignature}`);
      await provider.connection.confirmTransaction(txSignature, "confirmed");
      log(`Délégation ID ${delegationId} créée avec succès !`);
    } catch (err: any) {
      const errorMessage = err.message || JSON.stringify(err);
      log(`Erreur: ${errorMessage}`);
      alert(`Erreur: ${errorMessage}`);
    } finally {
      createButton.disabled = false;
    }
  };
}

if (revokeButton) {
  revokeButton.onclick = async () => {
    if (!provider || !program) {
      log("Veuillez d'abord connecter votre wallet.");
      return;
    }
    log("Préparation de la transaction revokeOrionDelegation...");
    revokeButton.disabled = true;

    try {
      const delegationId = new anchor.BN(
        (
          document.getElementById("revokeDelegationId") as HTMLInputElement
        ).value
      );
      const userPubkey = provider.wallet.publicKey;

      const [orionDelegationPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("orion_delegation"),
          userPubkey.toBuffer(),
          delegationId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
      const userWsolAta = getAssociatedTokenAddressSync(
        NATIVE_MINT,
        userPubkey
      );

      const txSignature = await program.methods
        .revokeOrionDelegation(delegationId)
        .accounts({
          userAuthority: userPubkey,
          orionDelegation: orionDelegationPda,
          userWsolAccount: userWsolAta,
          wsolMint: NATIVE_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      log(`Transaction de révocation envoyée ! Signature: ${txSignature}`);
      await provider.connection.confirmTransaction(txSignature, "confirmed");
      log(`Délégation ID ${delegationId} révoquée avec succès !`);
    } catch (err: any) {
      const errorMessage = err.message || JSON.stringify(err);
      log(`Erreur: ${errorMessage}`);
      alert(`Erreur: ${errorMessage}`);
    } finally {
      revokeButton.disabled = false;
    }
  };
}
