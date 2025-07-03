// Network Configurations
const networkConfig = {
    testnet: {
        chainId: '0x61',
        chainName: 'Binance Smart Chain Testnet',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        blockExplorerUrls: ['https://testnet.bscscan.com'],
        contractAddress: '0x7429438c74d705FA89951415b7a2b46dc713920f',
        vnstTokenAddress: '0x5C6cB004b50278c6726c3cBEDd25165c2072C46D',
        vntTokenAddress: '0xa7e41CB0A41dbFC801408d3B577fCed150c4eeEc',
        usdtTokenAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
    },
    mainnet: {
        chainId: '0x38',
        chainName: 'Binance Smart Chain Mainnet',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com'],
        contractAddress: '',
        vnstTokenAddress: '',
        vntTokenAddress: '',
        usdtTokenAddress: ''
    }
};

// Global Variables
let web3;
let vnstStakingContract;
let vnstTokenContract;
let vntTokenContract;
let usdtTokenContract;
let currentAccount = null;
let currentNetwork = 'testnet';
let isAdmin = false;

// Utility Functions
function formatNumber(num) {
    if (isNaN(num)) return "0";
    return parseFloat(num).toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

function safeSetTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

function showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    
    document.body.appendChild(successElement);
    
    setTimeout(() => {
        successElement.remove();
    }, 5000);
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const originalText = element.textContent;
        element.dataset.originalText = originalText;
        element.innerHTML = '<div class="loading-spinner"></div> Processing...';
        element.disabled = true;
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element && element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
        element.disabled = false;
    }
}

// Setup Card Animations
function setupCardAnimations() {
    const cards = document.querySelectorAll('.card');
    if (cards.length > 0) {
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    cardObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        cards.forEach(card => {
            cardObserver.observe(card);
        });
    }
}

// Toggle Menu Function
function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
        navLinks.classList.toggle('show');
        
        document.querySelectorAll('#nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
            });
        });
    }
}

// Initialize Contracts
async function initContracts() {
    try {
        const config = networkConfig[currentNetwork];
        
        // Initialize contracts with provided ABIs (user will paste them)
        vnstStakingContract = new web3.eth.Contract(vnstStakingABI, config.contractAddress);
        vnstTokenContract = new web3.eth.Contract(erc20ABI, config.vnstTokenAddress);
        vntTokenContract = new web3.eth.Contract(erc20ABI, config.vntTokenAddress);
        usdtTokenContract = new web3.eth.Contract(erc20ABI, config.usdtTokenAddress);
        
        if (currentAccount) {
            const owner = await vnstStakingContract.methods.owner().call();
            isAdmin = currentAccount.toLowerCase() === owner.toLowerCase();
            
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) adminPanel.style.display = isAdmin ? 'block' : 'none';
            
            const createFirstStakeBtn = document.getElementById('createFirstStakeBtn');
            if (createFirstStakeBtn) createFirstStakeBtn.style.display = isAdmin ? 'block' : 'none';
        }
        
    } catch (error) {
        console.error("Error initializing contracts:", error);
        throw error;
    }
}

// Check and Switch Network
async function checkNetwork() {
    try {
        const chainId = await web3.eth.getChainId();
        const expectedChainId = parseInt(networkConfig[currentNetwork].chainId, 16);
        
        if (chainId !== expectedChainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: networkConfig[currentNetwork].chainId }],
                });
                // After switching, reload data
                await initContracts();
                if (currentAccount) {
                    await loadData();
                }
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [networkConfig[currentNetwork]],
                        });
                    } catch (addError) {
                        console.error("Error adding network:", addError);
                        showError("Please add Binance Smart Chain network to your wallet");
                        throw addError;
                    }
                } else {
                    console.error("Error switching network:", switchError);
                    showError("Please switch to Binance Smart Chain network");
                    throw switchError;
                }
            }
        }
    } catch (error) {
        console.error("Network error:", error);
        showError("Network error: " + (error.message || error));
        throw error;
    }
}

// Connect Wallet Function
async function connectWallet() {
    try {
        if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            currentAccount = accounts[0];
            
            await checkNetwork();
            
            if (!vnstStakingContract) {
                await initContracts();
            }
            
            updateWalletConnectionUI(currentAccount);
            await loadData();
        } else {
            showError("Please install MetaMask to connect your wallet");
        }
    } catch (error) {
        console.error("Error connecting wallet:", error);
        showError("Error connecting wallet: " + (error.message || error));
    }
}

// Update Wallet Connection UI
function updateWalletConnectionUI(address) {
    if (!address) return;
    
    const walletButtons = document.querySelectorAll('.wallet-connect-btn');
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    
    walletButtons.forEach(btn => {
        if (btn) {
            btn.textContent = shortAddress;
            btn.classList.add('connected');
        }
    });
    
    const walletSections = document.querySelectorAll('#walletConnectSection, #teamWalletConnect');
    walletSections.forEach(section => {
        if (section) section.style.display = 'none';
    });
    
    const dashboards = document.querySelectorAll('#stakingDashboard, #teamDashboard');
    dashboards.forEach(dashboard => {
        if (dashboard) dashboard.style.display = 'block';
    });
    
    if (document.getElementById('referralLink')) {
        document.getElementById('referralLink').value = `${window.location.origin}${window.location.pathname}?ref=${currentAccount}`;
    }
}

// Load Data
async function loadData() {
    try {
        if (!currentAccount) return;
        
        if (!vnstStakingContract || !vnstTokenContract) {
            await initContracts();
        }
        
        // Show loading state
        document.querySelectorAll('.data-section').forEach(section => {
            if (section) section.style.display = 'none';
        });
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        
        if (document.getElementById('totalUsers')) {
            await loadGlobalStats();
        }
        
        if (document.getElementById('walletAddress')) {
            await loadUserData();
        }
        
        if (document.getElementById('teamDashboard')) {
            await loadTeamData();
        }
        
        // Hide loading and show data
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        document.querySelectorAll('.data-section').forEach(section => {
            if (section) section.style.display = 'block';
        });
        
    } catch (error) {
        console.error("Error loading data:", error);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        showError("Error loading data: " + (error.message || error));
    }
}

// Load Global Stats
async function loadGlobalStats() {
    try {
        const userStats = await vnstStakingContract.methods.getUserStats(currentAccount).call();
        safeSetTextContent('totalStaked', `${formatNumber(web3.utils.fromWei(userStats.totalStaked, 'ether'))} VNST`);
        safeSetTextContent('totalWithdrawn', `${formatNumber(web3.utils.fromWei(userStats.totalEarned, 'ether'))} VNST`);
        safeSetTextContent('totalUsers', formatNumber(userStats.directMembers));
        
        const stakeInfo = await vnstStakingContract.methods.stakes(currentAccount).call();
        safeSetTextContent('activeStaking', stakeInfo.active ? 
            `${formatNumber(web3.utils.fromWei(stakeInfo.amount, 'ether'))} VNST` : '0 VNST');
    } catch (error) {
        console.error("Error loading global stats:", error);
        safeSetTextContent('totalUsers', '0');
        safeSetTextContent('totalStaked', '0 VNST');
        safeSetTextContent('totalWithdrawn', '0 VNST');
        safeSetTextContent('activeStaking', '0 VNST');
    }
}

// Load User Data
async function loadUserData() {
    try {
        if (!currentAccount) return;
        
        safeSetTextContent('walletAddress', `${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`);
        
        const vnstBalance = await vnstTokenContract.methods.balanceOf(currentAccount).call();
        safeSetTextContent('walletBalance', `${formatNumber(web3.utils.fromWei(vnstBalance, 'ether'))} VNST`);
        
        const userStake = await vnstStakingContract.methods.stakes(currentAccount).call();
        safeSetTextContent('userTotalStaked', `${formatNumber(web3.utils.fromWei(userStake.amount, 'ether'))} VNST`);
        
        const userRewards = await vnstStakingContract.methods.rewards(currentAccount).call();
        safeSetTextContent('userTotalWithdrawn', `${formatNumber(web3.utils.fromWei(userRewards.claimedVNT, 'ether'))} VNT + ${formatNumber(web3.utils.fromWei(userRewards.claimedUSDT, 'ether'))} USDT`);
        
        safeSetTextContent('userActiveStaking', userStake.active ? 
            `${formatNumber(web3.utils.fromWei(userStake.amount, 'ether'))} VNST` : '0 VNST');
        
        const pendingRewards = await vnstStakingContract.methods.getPendingRewards(currentAccount).call();
        safeSetTextContent('level1Income', `${formatNumber(web3.utils.fromWei(pendingRewards.vntReward, 'ether'))} VNT`);
        safeSetTextContent('level2to5Income', `${formatNumber(web3.utils.fromWei(pendingRewards.usdtReward, 'ether'))} USDT`);
        
        const dailyROIPercent = await vnstStakingContract.methods.dailyROIPercent().call();
        const vnstPrice = await vnstStakingContract.methods.vnstPrice().call();
        
        if (userStake.active) {
            const stakedAmount = web3.utils.fromWei(userStake.amount, 'ether');
            const roiAmount = (stakedAmount * dailyROIPercent) / 100;
            const roiInUsdt = roiAmount * (web3.utils.fromWei(vnstPrice, 'ether'));
            safeSetTextContent('dailyROI', `${formatNumber(roiInUsdt)} USDT`);
        } else {
            safeSetTextContent('dailyROI', '0 USDT');
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        showError("Error loading user data. Please try refreshing the page.");
    }
}

// Load Team Data
async function loadTeamData() {
    try {
        if (!currentAccount) return;
        
        const userStats = await vnstStakingContract.methods.getUserStats(currentAccount).call();
        safeSetTextContent('directMembers', userStats.directMembers);
        
        let totalTeamMembers = 0;
        for (let level = 1; level <= 5; level++) {
            const levelMembers = await vnstStakingContract.methods.getLevelReferralCount(currentAccount, level).call();
            totalTeamMembers += parseInt(levelMembers);
            safeSetTextContent(`level${level}Members`, levelMembers);
        }
        safeSetTextContent('totalTeamMembers', totalTeamMembers);
        
        safeSetTextContent('teamTotalStaked', `${formatNumber(web3.utils.fromWei(userStats.totalStaked, 'ether'))} VNST`);
        
        const userStake = await vnstStakingContract.methods.stakes(currentAccount).call();
        safeSetTextContent('teamActiveStaking', userStake.active ? 
            `${formatNumber(web3.utils.fromWei(userStake.amount, 'ether'))} VNST` : '0 VNST');
        
        const tableBody = document.querySelector('#teamMembersTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            const level1Referrals = await vnstStakingContract.methods.getLevelReferrals(currentAccount, 1).call();
            
            for (let i = 0; i < Math.min(3, level1Referrals.length); i++) {
                const memberAddress = level1Referrals[i];
                const memberStake = await vnstStakingContract.methods.stakes(memberAddress).call();
                
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid var(--glass-border)';
                row.innerHTML = `
                    <td style="padding: 0.75rem;">1</td>
                    <td style="padding: 0.75rem;">${memberAddress.substring(0, 6)}...${memberAddress.substring(memberAddress.length - 4)}</td>
                    <td style="padding: 0.75rem;">${formatNumber(web3.utils.fromWei(memberStake.amount, 'ether'))} VNST</td>
                    <td style="padding: 0.75rem;">${new Date(memberStake.startTime * 1000).toLocaleDateString()}</td>
                `;
                tableBody.appendChild(row);
            }
        }
        
        const requiredMembers = [2, 2, 2, 2, 2];
        for (let level = 1; level <= 5; level++) {
            const statusElement = document.getElementById(`level${level}Status`);
            if (statusElement) {
                const hasEnoughMembers = parseInt(userStats.directMembers) >= requiredMembers[level-1];
                
                if (hasEnoughMembers) {
                    statusElement.textContent = 'Active';
                    statusElement.className = 'status-active';
                } else {
                    statusElement.textContent = 'Locked';
                    statusElement.className = 'status-locked';
                }
            }
        }
    } catch (error) {
        console.error("Error loading team data:", error);
        showError("Error loading team data. Please try again.");
    }
}

async function stakeTokens() {
    const stakeBtn = document.getElementById('stakeBtn');
    try {
        showLoading('stakeBtn');
        
        const amount = document.getElementById('stakeAmount').value;
        let referrer = document.getElementById('referrerAddress').value;
        
        // Validate amount
        if (!amount || isNaN(amount)) {
            showError("Please enter a valid amount");
            hideLoading('stakeBtn');
            return;
        }
        
        const amountWei = web3.utils.toWei(amount, 'ether');
        const minStake = 100 * 1e18;
        const maxStake = 10000 * 1e18;
        
        if (amountWei < minStake || amountWei > maxStake) {
            showError(`Amount must be between ${web3.utils.fromWei(minStake, 'ether')}-${web3.utils.fromWei(maxStake, 'ether')} VNST`);
            hideLoading('stakeBtn');
            return;
        }
        
        // Handle referrer
        const urlParams = new URLSearchParams(window.location.search);
        const urlRef = urlParams.get('ref');
        
        if (!referrer && urlRef && web3.utils.isAddress(urlRef)) {
            referrer = urlRef;
        } else if (!referrer) {
            referrer = await vnstStakingContract.methods.owner().call();
        }
        
        if (!web3.utils.isAddress(referrer)) {
            showError("Invalid referrer address");
            hideLoading('stakeBtn');
            return;
        }
        
        // Get the actual token address from the staking contract
        const stakingTokenAddress = await vnstStakingContract.methods.vnstToken().call();
        
        // Initialize token contract with correct address
        const correctTokenContract = new web3.eth.Contract(erc20ABI, stakingTokenAddress);
        
        // 1. Check current allowance
        const currentAllowance = await correctTokenContract.methods.allowance(
            currentAccount,
            networkConfig[currentNetwork].contractAddress
        ).call();
        
        console.log("Current allowance:", currentAllowance);
        
        // 2. Reset allowance to zero if needed
        if (parseInt(currentAllowance) > 0) {
            showSuccess("Resetting previous approval...");
            try {
                const resetTx = await correctTokenContract.methods.approve(
                    networkConfig[currentNetwork].contractAddress,
                    '0'
                ).send({ from: currentAccount });
                
                console.log("Reset tx hash:", resetTx.transactionHash);
                
                // Wait for reset to be confirmed
                let resetReceipt = await web3.eth.getTransactionReceipt(resetTx.transactionHash);
                while (!resetReceipt || !resetReceipt.blockNumber) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    resetReceipt = await web3.eth.getTransactionReceipt(resetTx.transactionHash);
                }
                console.log("Reset confirmed in block:", resetReceipt.blockNumber);
            } catch (resetError) {
                console.error("Reset error:", resetError);
                // Continue even if reset fails
            }
        }
        
        // 3. Set new allowance
        showSuccess("Approving tokens...");
        try {
            const approveTx = await correctTokenContract.methods.approve(
                networkConfig[currentNetwork].contractAddress,
                amountWei
            ).send({ from: currentAccount });
            
            console.log("Approve tx hash:", approveTx.transactionHash);
            
            // Wait for approval to be confirmed
            let approveReceipt = await web3.eth.getTransactionReceipt(approveTx.transactionHash);
            while (!approveReceipt || !approveReceipt.blockNumber) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                approveReceipt = await web3.eth.getTransactionReceipt(approveTx.transactionHash);
            }
            console.log("Approval confirmed in block:", approveReceipt.blockNumber);
            
            // Verify the new allowance
            const newAllowance = await correctTokenContract.methods.allowance(
                currentAccount,
                networkConfig[currentNetwork].contractAddress
            ).call();
            
            console.log("New allowance:", newAllowance);
            
            if (BigInt(newAllowance) < BigInt(amountWei)) {
                throw new Error(`Approval failed. Current allowance: ${newAllowance}, Required: ${amountWei}`);
            }
            
            showSuccess("Approval confirmed. Now staking...");
        } catch (approveError) {
            console.error("Approval failed:", approveError);
            showError("Token approval failed. Please try again.");
            hideLoading('stakeBtn');
            return;
        }
        
        // 4. Execute stake with proper gas handling
        try {
            // Estimate gas first
            const gasEstimate = await vnstStakingContract.methods.stake(
                amountWei,
                referrer
            ).estimateGas({ from: currentAccount });
            
            console.log("Gas estimate:", gasEstimate);
            
            // Add 30% buffer
            const gasWithBuffer = Math.floor(gasEstimate * 1.3);
            
            const stakeTx = await vnstStakingContract.methods.stake(
                amountWei,
                referrer
            ).send({ 
                from: currentAccount,
                gas: gasWithBuffer
            });
            
            console.log("Stake tx hash:", stakeTx.transactionHash);
            
            // Wait for stake to be confirmed
            let stakeReceipt = await web3.eth.getTransactionReceipt(stakeTx.transactionHash);
            while (!stakeReceipt || !stakeReceipt.blockNumber) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                stakeReceipt = await web3.eth.getTransactionReceipt(stakeTx.transactionHash);
            }
            console.log("Stake confirmed in block:", stakeReceipt.blockNumber);
            
            showSuccess("Tokens staked successfully!");
            document.getElementById('stakeAmount').value = '';
            await loadData();
            
        } catch (stakeError) {
            console.error("Staking failed:", stakeError);
            
            // Try to decode revert reason
            let errorMsg = "Staking failed";
            if (stakeError.data) {
                try {
                    const decoded = web3.eth.abi.decodeParameter('string', stakeError.data.slice(10));
                    errorMsg = decoded;
                } catch (decodeError) {
                    console.error("Couldn't decode error:", decodeError);
                }
            } else if (stakeError.message.includes("execution reverted")) {
                errorMsg = stakeError.message.split("execution reverted: ")[1] || "Unknown reason";
            }
            
            showError(errorMsg);
        }
        
    } catch (error) {
        console.error("Unexpected error:", error);
        showError("An unexpected error occurred");
    } finally {
        hideLoading('stakeBtn');
    }
}

// Create First Stake (Admin Only - Updated)
async function createFirstStake() {
    try {
        showLoading('createFirstStakeBtn');
        
        if (!isAdmin) {
            showError("Only contract owner can create first stake");
            hideLoading('createFirstStakeBtn');
            return;
        }
        
        const stakeAmount = web3.utils.toWei("100", "ether");
        
        // Check allowance first and reset if needed
        const allowance = await vnstTokenContract.methods.allowance(
            currentAccount,
            networkConfig[currentNetwork].contractAddress
        ).call();
        
        if (parseInt(allowance) > 0) {
            await vnstTokenContract.methods.approve(
                networkConfig[currentNetwork].contractAddress,
                '0'
            ).send({ from: currentAccount });
            
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
        // Set new allowance
        await vnstTokenContract.methods.approve(
            networkConfig[currentNetwork].contractAddress,
            stakeAmount
        ).send({ from: currentAccount });
        
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Use the special createFirstStake function that allows zero address referrer
        await vnstStakingContract.methods.createFirstStake(stakeAmount).send({ 
            from: currentAccount,
            gas: 300000
        });
        
        showSuccess("First stake created successfully!");
        await loadData();
    } catch (error) {
        console.error("Error creating first stake:", error);
        let errorMsg = "Error creating first stake";
        
        if (error.message.includes("revert")) {
            const revertReason = error.message.match(/reason string: '(.+)'/);
            errorMsg = revertReason ? revertReason[1] : "Transaction reverted";
        } else if (error.message.includes("User denied transaction")) {
            errorMsg = "Transaction cancelled by user";
        }
        
        showError(errorMsg);
    } finally {
        hideLoading('createFirstStakeBtn');
    }
}

// Claim Rewards
async function claimRewards() {
    const claimBtn = document.getElementById('claimTokenBtn') || document.getElementById('claimUsdtBtn');
    try {
        showLoading(claimBtn.id);
        
        const pendingRewards = await vnstStakingContract.methods.getPendingRewards(currentAccount).call();
        const minVNTWithdrawal = 10 * 1e18; // 10 VNT
        
        if (parseInt(pendingRewards.vntReward) < parseInt(minVNTWithdrawal)) {
            showError(`Minimum withdrawal is ${web3.utils.fromWei(minVNTWithdrawal, 'ether')} VNT`);
            hideLoading(claimBtn.id);
            return;
        }
        
        await vnstStakingContract.methods.claimRewards().send({ 
            from: currentAccount,
            gas: 250000
        });
        
        showSuccess("Rewards claimed successfully!");
        await loadData();
        
    } catch (error) {
        console.error("Error claiming rewards:", error);
        let errorMsg = "Claiming rewards failed";
        
        if (error.message.includes("revert")) {
            if (error.message.includes("Below minimum VNT withdrawal")) {
                errorMsg = `Minimum withdrawal is ${web3.utils.fromWei(10 * 1e18, 'ether')} VNT`;
            } else if (error.message.includes("Can only claim once per day")) {
                errorMsg = "You can only claim rewards once per day";
            } else {
                const revertReason = error.message.match(/reason string: '(.+)'/);
                errorMsg = revertReason ? revertReason[1] : "Transaction reverted";
            }
        } else if (error.message.includes("User denied transaction")) {
            errorMsg = "Transaction cancelled by user";
        } else if (error.message.includes("execution reverted")) {
            const revertReason = error.message.split("execution reverted: ")[1] || "Unknown reason";
            errorMsg = `Transaction failed: ${revertReason}`;
        }
        
        showError(errorMsg);
    } finally {
        hideLoading(claimBtn.id);
    }
}

// Copy Referral Link
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        referralLink.select();
        document.execCommand('copy');
        showSuccess("Referral link copied to clipboard!");
    }
}

// Share Referral Link
function shareReferralLink() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const link = referralLink.value;
        
        if (navigator.share) {
            navigator.share({
                title: 'Join VNST Staking Platform',
                text: 'Stake VNST tokens and earn rewards!',
                url: link
            }).catch(err => {
                console.error('Error sharing:', err);
            });
        } else {
            window.open(`https://twitter.com/intent/tweet?text=Join%20VNST%20Staking%20Platform%20and%20earn%20rewards!%20${encodeURIComponent(link)}`, '_blank');
        }
    }
}

// Initialize Event Listeners
function initEventListeners() {
    // Wallet Connect Buttons
    document.querySelectorAll('.wallet-connect-btn, #connectWalletBtn, #teamConnectWalletBtn').forEach(btn => {
        if (btn) btn.addEventListener('click', connectWallet);
    });
    
    // Stake Button
    const stakeBtn = document.getElementById('stakeBtn');
    if (stakeBtn) stakeBtn.addEventListener('click', stakeTokens);
    
    // Claim Buttons
    const claimTokenBtn = document.getElementById('claimTokenBtn');
    if (claimTokenBtn) claimTokenBtn.addEventListener('click', claimRewards);
    
    const claimUsdtBtn = document.getElementById('claimUsdtBtn');
    if (claimUsdtBtn) claimUsdtBtn.addEventListener('click', claimRewards);
    
    // Referral Buttons
    const copyReferralBtn = document.getElementById('copyReferralBtn');
    if (copyReferralBtn) copyReferralBtn.addEventListener('click', copyReferralLink);
    
    const shareReferralBtn = document.getElementById('shareReferralBtn');
    if (shareReferralBtn) shareReferralBtn.addEventListener('click', shareReferralLink);
    
    // Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    
    // Create First Stake Button
    const createFirstStakeBtn = document.getElementById('createFirstStakeBtn');
    if (createFirstStakeBtn) createFirstStakeBtn.addEventListener('click', createFirstStake);
    
    // Auto-fill referrer address from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refAddress = urlParams.get('ref');
    const referrerInput = document.getElementById('referralLink');
    if (refAddress && web3.utils.isAddress(refAddress) && referrerInput && !referrerInput.value) {
        referrerInput.value = refAddress;
    }
}

// Initialize App
async function initApp() {
    try {
        // Initialize event listeners first
        initEventListeners();
        
        // Setup animations
        setupCardAnimations();
        
        // Add loading indicator
        if (!document.getElementById('loadingIndicator')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingIndicator';
            loadingDiv.style.display = 'none';
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.padding = '20px';
            loadingDiv.innerHTML = '<div class="loading-spinner"></div> Loading data...';
            document.body.insertBefore(loadingDiv, document.body.firstChild);
        }
        
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
            
            // Handle events
            window.ethereum.on('disconnect', () => window.location.reload());
            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length === 0) window.location.reload();
                else {
                    currentAccount = accounts[0];
                    updateWalletConnectionUI(currentAccount);
                    await loadData();
                }
            });
            window.ethereum.on('chainChanged', () => window.location.reload());
            
            if (window.ethereum.selectedAddress) {
                currentAccount = window.ethereum.selectedAddress;
                await checkNetwork();
                await initContracts();
                updateWalletConnectionUI(currentAccount);
                await loadData();
            } else {
                const walletConnectSection = document.getElementById('walletConnectSection');
                if (walletConnectSection) walletConnectSection.style.display = 'block';
            }
        } else {
            showError("Please install MetaMask or another Web3 wallet");
            const walletConnectSection = document.getElementById('walletConnectSection');
            if (walletConnectSection) walletConnectSection.style.display = 'block';
        }
    } catch (error) {
        console.error("Initialization error:", error);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        showError("App initialization failed. Please refresh the page.");
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// ABIs will be added by user
let vnstStakingABI = [{"inputs":[{"internalType":"address","name":"_vnstToken","type":"address"},{"internalType":"address","name":"_vntToken","type":"address"},{"internalType":"address","name":"_usdtToken","type":"address"},{"internalType":"address","name":"_vnstStakingWallet","type":"address"},{"internalType":"address","name":"_vntRewardWallet","type":"address"},{"internalType":"address","name":"_usdtRewardWallet","type":"address"},{"internalType":"address","name":"_autoStakeWallet","type":"address"},{"internalType":"address","name":"_feeWallet","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"Blacklisted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPercent","type":"uint256"}],"name":"ROIPercentChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint256","name":"level","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bool","name":"inVNST","type":"bool"}],"name":"ReferralEarned","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"RewardClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"}],"name":"RewardRateChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"address","name":"referrer","type":"address"}],"name":"Staked","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newVnstPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newVntPrice","type":"uint256"}],"name":"TokenPricesUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"Unblacklisted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"inputs":[],"name":"ANTI_SYBLOCK_DURATION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"CLAIM_INTERVAL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_STAKE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_STAKE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_VNT_WITHDRAWAL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REWARD_INTERVAL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WITHDRAWAL_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"annualRewardRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"autoStakeWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"blacklistUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"blacklisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"createFirstStake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"dailyROIPercent","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"directIncomePercents","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"feeWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"forceClaim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"level","type":"uint256"}],"name":"getLevelReferralCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"level","type":"uint256"}],"name":"getLevelReferrals","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getPendingRewards","outputs":[{"internalType":"uint256","name":"vntReward","type":"uint256"},{"internalType":"uint256","name":"usdtReward","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getReferralCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserStats","outputs":[{"internalType":"uint256","name":"totalStaked","type":"uint256"},{"internalType":"uint256","name":"totalEarned","type":"uint256"},{"internalType":"uint256","name":"directMembers","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getWalletBalances","outputs":[{"internalType":"uint256","name":"vnstStakingBalance","type":"uint256"},{"internalType":"uint256","name":"vntRewardBalance","type":"uint256"},{"internalType":"uint256","name":"usdtRewardBalance","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"levelReferrals","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"recoverETH","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"recoverTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"referrals","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"requiredDirectMembers","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"rewards","outputs":[{"internalType":"uint256","name":"pendingVNT","type":"uint256"},{"internalType":"uint256","name":"pendingUSDT","type":"uint256"},{"internalType":"uint256","name":"claimedVNT","type":"uint256"},{"internalType":"uint256","name":"claimedUSDT","type":"uint256"},{"internalType":"uint256","name":"lastClaimTime","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_dailyROIPercent","type":"uint256"}],"name":"setDailyROIPercent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_annualRewardRate","type":"uint256"}],"name":"setRewardRate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntPrice","type":"uint256"}],"name":"setTokenPrices","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_vnstStakingWallet","type":"address"},{"internalType":"address","name":"_vntRewardWallet","type":"address"},{"internalType":"address","name":"_usdtRewardWallet","type":"address"},{"internalType":"address","name":"_autoStakeWallet","type":"address"},{"internalType":"address","name":"_feeWallet","type":"address"}],"name":"setWallets","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lastClaimTime","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"unblacklistUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"usdtRewardWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usdtToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userStats","outputs":[{"internalType":"uint256","name":"totalDirectMembers","type":"uint256"},{"internalType":"uint256","name":"totalStaked","type":"uint256"},{"internalType":"uint256","name":"totalEarned","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstStakingWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntRewardWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"}]; // User will paste VNST Staking ABI here
let erc20ABI = [{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"_decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]; // User will paste ERC20 ABI here
