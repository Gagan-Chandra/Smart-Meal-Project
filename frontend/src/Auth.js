import React, { useState } from 'react';

function Auth({ setToken }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const API_URL = 'http://104.154.238.75:5000'; // Update this to match the backend's external IP

    const handleAuth = async () => {
        const url = `${API_URL}/api/${isLogin ? 'login' : 'register'}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                if (isLogin) {
                    localStorage.setItem('token', data.token);
                    setToken(data.token);
                } else {
                    alert('Registration successful! Please login.');
                    setIsLogin(true);
                }
            } else {
                setErrorMessage(data.error);
            }
        } catch (error) {
            setErrorMessage('Something went wrong.');
        }
    };

    return (
        <div>
            <h1>{isLogin ? 'Login' : 'Register'}</h1>
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleAuth}>{isLogin ? 'Login' : 'Register'}</button>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            <p>
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <span onClick={() => setIsLogin(!isLogin)} style={{ color: 'blue', cursor: 'pointer' }}>
                    {isLogin ? 'Register' : 'Login'}
                </span>
            </p>
        </div>
    );
}

export default Auth;
