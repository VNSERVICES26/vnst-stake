<!-- script.js -->
function toggleMenu() {
  const navList = document.getElementById("nav-list");
  navList.classList.toggle("show");
}

document.addEventListener("DOMContentLoaded", () => {
  const connectWalletBtn = document.getElementById("connectWallet");
  const stakeBtn = document.getElementById("stakeBtn");

  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          connectWalletBtn.classList.add("connected");
          connectWalletBtn.textContent = "Wallet Connected";
        } catch (err) {
          alert("Wallet connection failed: " + err.message);
        }
      } else {
        alert("MetaMask not found. Please install MetaMask.");
      }
    });
  }

  if (stakeBtn) {
    stakeBtn.addEventListener("click", async () => {
      const amount = document.getElementById("stakeAmount").value;
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        alert("Please enter a valid amount to stake.");
        return;
      }
      alert(`Stake ${amount} VNS initiated (connect to smart contract here).`);
    });
  }
});
