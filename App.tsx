
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Account, Message, MessageDetails } from './types';
import { mailTmService } from './services/mailTmService';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import EmailDetailsScreen from './components/EmailDetailsScreen';
import Toast from './components/Toast';

const App: React.FC = () => {
    const [isSplashVisible, setSplashVisible] = useState(true);
    const [account, setAccount] = useState<Account | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<MessageDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [currentView, setCurrentView] = useState<'home' | 'details'>('home');
    const [isDeleting, setIsDeleting] = useState(false);

    const inboxIntervalRef = useRef<number | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleApiError = (error: any, context: string) => {
        console.error(`${context} error:`, error);
        if (error.response && error.response.status === 401) {
            showToast('Session expired. Generating new email...', 'error');
            getNewEmail(true); // Force delete and create new
        } else {
            showToast(error.message || 'An unknown error occurred', 'error');
        }
    };
    
    const getNewEmail = useCallback(async (isDelete = false) => {
        setIsLoading(true);
        if (isDelete) setIsDeleting(true);
        
        if (inboxIntervalRef.current) {
            clearInterval(inboxIntervalRef.current);
        }

        if (isDelete && account) {
            try {
                await mailTmService.deleteAccount(account.id, account.token);
            } catch (e) {
                // Ignore delete errors, just create a new account
                console.warn("Could not delete previous account, proceeding with new one.", e);
            }
        }

        try {
            const newAccount = await mailTmService.createAccount();
            setAccount(newAccount);
            setMessages([]);
            showToast(isDelete ? 'Account deleted. New email generated!' : 'New email generated!', 'success');
        } catch (error) {
            handleApiError(error, 'getNewEmail');
        } finally {
            setIsLoading(false);
            setIsDeleting(false);
        }
    }, [account]);

    const checkInbox = useCallback(async () => {
        if (!account || !account.token) return;

        try {
            const newMessages = await mailTmService.getMessages(account.token);
            if (newMessages.length > messages.length) {
                showToast(`You have ${newMessages.length - messages.length} new email(s)!`);
            }
            setMessages(newMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
           handleApiError(error, 'checkInbox');
        }
    }, [account, messages.length]);


    const openEmail = async (id: string) => {
        if (!account) return;
        setIsLoading(true);
        try {
            const messageDetails = await mailTmService.getMessageById(id, account.token);
            setSelectedMessage(messageDetails);
            setCurrentView('details');
        } catch (error) {
            handleApiError(error, 'openEmail');
        } finally {
            setIsLoading(false);
        }
    };

    const goHome = () => {
        setSelectedMessage(null);
        setCurrentView('home');
        checkInbox(); // Refresh inbox on return
    };
    
    // Initial load
    useEffect(() => {
        const init = async () => {
            await getNewEmail();
            setSplashVisible(false);
        };
        setTimeout(init, 2500); // Simulate loading time for splash
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Inbox polling
    useEffect(() => {
        if (account && !inboxIntervalRef.current) {
            checkInbox(); // Initial check
            inboxIntervalRef.current = window.setInterval(checkInbox, 10000);
        }
        return () => {
            if (inboxIntervalRef.current) {
                clearInterval(inboxIntervalRef.current);
                inboxIntervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account]);

    if (isSplashVisible) {
        return <SplashScreen />;
    }

    return (
        <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {currentView === 'home' ? (
                <HomeScreen
                    account={account}
                    messages={messages}
                    isLoading={isLoading}
                    isDeleting={isDeleting}
                    onNewEmail={() => getNewEmail(false)}
                    onDeleteEmail={() => getNewEmail(true)}
                    onRefresh={checkInbox}
                    onOpenEmail={openEmail}
                    onCopyToClipboard={() => showToast('Copied to clipboard!')}
                    onTimerExpired={() => showToast('Timer expired! Extend or get a new email.', 'error')}
                />
            ) : (
                <EmailDetailsScreen message={selectedMessage} onBack={goHome} />
            )}
            {toast && <Toast message={toast.message} type={toast.type} />}
        </div>
    );
};

export default App;
