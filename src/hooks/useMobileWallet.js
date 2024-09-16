import { useState, useCallback } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";

export function useMobileWallet() {
  const [connected, setConnected] = useState(false);
  const [wallet, setWallet] = useState(null);

  const connectWallet = useCallback(async () => {
    try {
      const { accounts, selectedAccount } = await transact(async (wallet) => {
        const accounts = await wallet.getAccounts();
        const selectedAccount = accounts[0] || null;
        return { accounts, selectedAccount };
      });

      if (selectedAccount) {
        setWallet(selectedAccount);
        setConnected(true);
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
    }
  }, []);

  return { wallet, connected, connectWallet };
}
