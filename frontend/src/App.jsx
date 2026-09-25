// frontend/src/app.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from './api';
import DatePicker from 'react-datepicker';
import './App.css'; // Use the basic CSS

// --- Reusable Components ---
function ErrorDisplay({ message }) { return message ? <p className="error-message">{message}</p> : null; }
function SuccessDisplay({ message }) { return message ? <p className="success-message">{message}</p> : null; }
function LoadingDisplay({ isLoading, text = "Loading..." }) { return isLoading ? <div className="loading">{text}</div> : null; }
function Spinner() { return <div className="spinner"></div>; }


// --- Auth Form --- (Handles Login/Register)
function AuthForm({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('patient');
    const [specialization, setSpecialization] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        const url = isLogin ? '/auth/login' : '/auth/register';
        const payload = isLogin ? { email, password } : { name, email, password, role, specialization: role === 'provider' ? specialization : undefined };

        try {
            const response = await apiClient.post(url, payload);
            onAuthSuccess(response.data); // Pass user data and token
        } catch (err) {
            const errMsg = err.response?.data?.message ||
                         (err.response?.data?.errors ? err.response.data.errors[0].msg : null) ||
                         `Failed to ${isLogin ? 'login' : 'register'}. Please check details.`;
            setError(errMsg);
            console.error(err.response || err);
        } finally { setLoading(false); }
    };

    // Fully implemented JSX for AuthForm
    return (
         <div className="section auth-section">
            <h2>{isLogin ? 'Login' : 'Register'}</h2>
            <ErrorDisplay message={error} />
            <form onSubmit={handleSubmit}>
                {!isLogin && ( <div><label htmlFor="auth-name">Name:</label><input id="auth-name" type="text" value={name} onChange={e => setName(e.target.value)} required={!isLogin} /></div> )}
                <div><label htmlFor="auth-email">Email:</label><input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
                <div><label htmlFor="auth-password">Password:</label><input id="auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={isLogin ? 'current-password' : 'new-password'}/></div>
                {!isLogin && (
                    <>
                    <div>
                        <label htmlFor="auth-role">Role:</label>
                        <select id="auth-role" value={role} onChange={e => setRole(e.target.value)}>
                            <option value="patient">Patient</option>
                            <option value="provider">Provider</option>
                        </select>
                    </div>
                    {role === 'provider' && ( <div><label htmlFor="auth-spec">Specialization:</label><input id="auth-spec" type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} required={role === 'provider'} placeholder="e.g., Cardiology, General Practice" /></div> )}
                    </>
                )}
                <button type="submit" disabled={loading}>
                    {loading && <Spinner />}
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
                </button>
            </form>
            <button onClick={() => { setIsLogin(!isLogin); setError('');}} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginTop: '1rem', padding: 0, fontSize: '0.9rem' }}>
                {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
        </div>
    );
}

// --- Appointment Form ---
function AppointmentForm({ providers, onAppointmentBooked, isLoadingProviders }) {
     const [providerId, setProviderId] = useState('');
     const [dateTime, setDateTime] = useState(() => { const now = new Date(); now.setMinutes(now.getMinutes() + 15); now.setSeconds(0); now.setMilliseconds(0); return now; });
     const [reason, setReason] = useState('');
     const [error, setError] = useState('');
     const [success, setSuccess] = useState('');
     const [loading, setLoading] = useState(false);
     const filterPassedTime = (time) => { const current = new Date(); const selected = new Date(time); return selected.getTime() > current.getTime(); };

     const handleSubmit = async (e) => {
         e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
         if (!providerId) { setError('Please select a provider.'); setLoading(false); return; }
         if (dateTime < new Date()) { setError('Cannot select a past date/time.'); setLoading(false); return; }
         try { const response = await apiClient.post('/appointments', { providerId: parseInt(providerId), dateTime: dateTime.toISOString(), reason }); onAppointmentBooked(response.data); setSuccess('Appointment booked!'); setProviderId(''); setDateTime(() => { const now = new Date(); now.setMinutes(now.getMinutes() + 15); now.setSeconds(0); now.setMilliseconds(0); return now; }); setReason(''); setTimeout(() => setSuccess(''), 4000); }
         catch (err) { const errMsg = err.response?.data?.message || 'Failed to book appointment.'; setError(errMsg); console.error(err.response || err); }
         finally { setLoading(false); }
     };

     // Fully implemented JSX
     return (
         <form onSubmit={handleSubmit}>
            <h3>Book Appointment</h3>
            <ErrorDisplay message={error} /> <SuccessDisplay message={success} />
             <div>
                 <label htmlFor="appt-provider">Provider:</label>
                 <select id="appt-provider" value={providerId} onChange={e => setProviderId(e.target.value)} required disabled={loading || isLoadingProviders || providers.length === 0}>
                     <option value="" disabled>{isLoadingProviders ? "Loading..." : "Select a provider..."}</option>
                     {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.specialization || 'Provider'})</option>)}
                 </select>
                 {!isLoadingProviders && providers.length === 0 && <small style={{color:'grey', display:'block', marginTop:'3px'}}>No providers available.</small>}
             </div>
              <div>
                  <label>Date & Time:</label>
                  <DatePicker selected={dateTime} onChange={(date) => setDateTime(date || new Date())} showTimeSelect filterTime={filterPassedTime} dateFormat="MMMM d, yyyy h:mm aa" minDate={new Date()} required disabled={loading || isLoadingProviders} popperPlacement="top-start" />
              </div>
              <div>
                  <label htmlFor="appt-reason">Reason (Optional):</label>
                  <textarea id="appt-reason" value={reason} onChange={e => setReason(e.target.value)} disabled={loading || isLoadingProviders} rows={2}></textarea>
              </div>
              <button type="submit" disabled={loading || isLoadingProviders || !providerId}> {loading && <Spinner />} {loading ? 'Booking...' : 'Book Appointment'} </button>
         </form>
     );
}

// --- Reschedule Modal Component ---
function RescheduleModal({ isOpen, onClose, appointment, onRescheduleSubmit, loading }) {
    const [newDateTime, setNewDateTime] = useState(new Date());
    const [newReason, setNewReason] = useState('');
    const [error, setError] = useState('');
    useEffect(() => { if (appointment) { const originalDate = new Date(appointment.dateTime); const now = new Date(); setNewDateTime(originalDate > now ? originalDate : new Date(now.getTime() + 60 * 60000)); setNewReason(appointment.reason || ''); } setError(''); }, [appointment, isOpen]);
    const handleSubmit = async (e) => { e.preventDefault(); setError(''); if (newDateTime < new Date()) { setError("Cannot reschedule to past."); return; } try { await onRescheduleSubmit(appointment.id, newDateTime.toISOString(), newReason); } catch (err) { setError(err.response?.data?.message || "Failed reschedule."); } };
    const filterPassedTime = (time) => { return new Date(time).getTime() > new Date().getTime(); };
    if (!isOpen || !appointment) return null;
    // Fully implemented JSX
    return ( <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}> <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', minWidth: '400px', maxWidth: '500px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}> <h2>Reschedule Appointment</h2> <p style={{fontSize: '0.9em', color: '#555', marginBottom: '1rem'}}> Current: {new Date(appointment.dateTime).toLocaleString()} with {appointment.provider?.name} </p> <ErrorDisplay message={error} /> <form onSubmit={handleSubmit}> <div><label>New Date & Time:</label><DatePicker selected={newDateTime} onChange={(date) => setNewDateTime(date || new Date())} showTimeSelect filterTime={filterPassedTime} dateFormat="MMMM d, yyyy h:mm aa" minDate={new Date()} required disabled={loading} popperPlacement="top-start" wrapperClassName="w-full" /></div> <div><label htmlFor="resched-reason">Reason:</label><textarea id="resched-reason" value={newReason} onChange={e => setNewReason(e.target.value)} disabled={loading} rows={2}></textarea></div> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}> <button type="button" onClick={onClose} disabled={loading} style={{ background: '#6c757d' }}>Cancel</button> <button type="submit" disabled={loading}> {loading && <Spinner />} {loading ? 'Rescheduling...' : 'Confirm'} </button> </div> </form> </div> </div> );
}


// --- Appointment List ---
function AppointmentList({ title, appointments, userRole, onCancelAppointment, onReschedule, onMarkComplete, loading }) { // Added onMarkComplete
    const handleCancel = (id, e) => { e.stopPropagation(); if(window.confirm('Are you sure?')) { onCancelAppointment(id); } };
    const handleRescheduleClick = (app, e) => { e.stopPropagation(); onReschedule(app); }
    const handleCompleteClick = (id, e) => { e.stopPropagation(); if(window.confirm('Mark as completed?')) { onMarkComplete(id); } }
    // Fully implemented JSX
    return ( <div> {title && <h3>{title}</h3>} <LoadingDisplay isLoading={loading && appointments.length === 0} text="Loading..." /> {loading && appointments.length > 0 && <LoadingDisplay isLoading={true} text="Updating..." />} {appointments.length === 0 && !loading ? <p>None found.</p> : ( <ul>{appointments.map(app => ( <li key={app.id} style={{ opacity: app.status === 'Cancelled' ? 0.6 : 1, background: app.status === 'Completed' ? '#e9f5e9' : '#f8f9fa' }}> <span style={{ flexGrow: 1, marginRight: '1rem' }}> {new Date(app.dateTime).toLocaleString()} with {userRole === 'patient' ? ` ${app.provider?.name || '?'}` : ` ${app.patient?.name || '?'}`} <strong style={{ marginLeft: '5px' }}>({app.status})</strong> {app.reason ? <em style={{ display: 'block', fontSize: '0.85em', color: '#555', marginTop: '3px' }}>Reason: {app.reason}</em> : ''} </span> <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}> {userRole === 'provider' && app.status === 'Upcoming' && ( <> <button onClick={(e) => handleCompleteClick(app.id, e)} disabled={loading} title="Complete" style={{ background: '#28a745', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Complete</button> <button onClick={(e) => handleCancel(app.id, e)} disabled={loading} title="Cancel" style={{ background: '#dc3545', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Cancel</button> </> )} {userRole === 'patient' && app.status === 'Upcoming' && ( <> <button onClick={(e) => handleRescheduleClick(app, e)} disabled={loading} title="Reschedule" style={{ background: '#ffc107', color: '#333', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Reschedule</button> <button onClick={(e) => handleCancel(app.id, e)} disabled={loading} title="Cancel" style={{ background: '#dc3545', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Cancel</button> </> )} </div> </li> ))}</ul> )} </div> );
}

// --- Resource Summary Component ---
function ResourceSummary({ resources, loading }) {
    // Fully implemented logic and JSX
    if (loading) { return <div className="section resource-summary"><LoadingDisplay isLoading={true} text="Loading Resources..." /></div>; }
    if (!resources) { return <div className="section resource-summary"><h3>Resource Overview</h3><p>Loading...</p></div>; }
    if (resources.length === 0) { return <div className="section resource-summary"><h3>Resource Overview</h3><p>No resources found.</p></div>; }
    const total = resources.length; const available = resources.filter(r => r.status === 'Available').length; const occupied = total - available;
    return ( <div className="section resource-summary"> <h3>Resource Overview</h3> <p>Total: <strong>{total}</strong></p> <p style={{ color: 'green' }}>Available: <strong>{available}</strong></p> <p style={{ color: 'orange' }}>Occupied: <strong>{occupied}</strong></p> </div> );
}

// --- Resource List (Detailed) ---
function ResourceList({ resources, userRole, onUpdateStatus, loading }) {
     // Fully implemented logic and JSX
     return ( <div> <h3>Resource Details</h3> <LoadingDisplay isLoading={loading && (!resources || resources.length === 0)} text="Loading..." /> {(!resources || resources.length === 0) && !loading ? <p>No resources.</p> : ( <ul style={{maxHeight: '300px'}}>{resources?.map(res => ( <li key={res.id}> <span>{res.name} ({res.type}) - Status: <strong style={{ color: res.status === 'Available' ? 'green' : 'orange'}}>{res.status}</strong></span> {userRole === 'provider' && ( <button onClick={() => onUpdateStatus(res.id, res.status === 'Available' ? 'Occupied' : 'Available')} disabled={loading} style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}> Mark as {res.status === 'Available' ? 'Occupied' : 'Available'} </button> )} </li> ))}</ul> )} </div> );
}

// --- Notification List ---
function NotificationList({ notifications, onMarkRead, onMarkAllRead, loading }) {
    // Fully implemented logic and JSX
     const unreadCount = notifications.filter(n => !n.read).length;
     return ( <div className="section"> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem'}}> <h3>Notifications {unreadCount > 0 && `(${unreadCount} unread)`}</h3> {notifications.length > 0 && ( <button onClick={onMarkAllRead} disabled={loading || unreadCount === 0} style={{ fontSize: '0.8rem', background: '#6c757d', padding: '0.3rem 0.6rem' }}> Mark All Read </button> )} </div> <LoadingDisplay isLoading={loading && notifications.length === 0} text="Loading..." /> {notifications.length === 0 && !loading ? <p>No notifications.</p> : ( <ul style={{clear: 'both', maxHeight: '500px'}}>{notifications.map(n => ( <li key={n.id} className="notification-item" style={{ opacity: n.read ? 0.6 : 1 }}> <span style={{ flexGrow: 1, marginRight: '0.5rem' }}> ({n.type}) {n.message} <br /> <small style={{ color: '#555' }}>{new Date(n.createdAt).toLocaleString()}</small> </span> {!n.read && ( <button onClick={() => onMarkRead(n.id)} disabled={loading} title="Mark Read"> ✓ </button> )} </li> ))}</ul> )} </div> );
}

// --- Main App Component ---
function App() {
    // State Hooks
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('authToken'));
    const [authLoading, setAuthLoading] = useState(true);
    const [providers, setProviders] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [resources, setResources] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [appError, setAppError] = useState('');
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
    const [appointmentSearchTerm, setAppointmentSearchTerm] = useState('');
    const searchTimeoutRef = useRef(null);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [loadingProviders, setLoadingProviders] = useState(false);

    // --- Logout Handler ---
    const handleLogout = useCallback(() => { localStorage.removeItem('authToken'); delete apiClient.defaults.headers.common['Authorization']; setToken(null); setUser(null); setAppointments([]); setResources([]); setNotifications([]); setProviders([]); setAppError(''); setAppointmentSearchTerm(''); setIsRescheduleModalOpen(false); console.log("User logged out."); }, []);

    // --- Initial Auth Check ---
    const checkAuth = useCallback(async () => { const currentToken = localStorage.getItem('authToken'); if (currentToken && currentToken !== 'undefined' && currentToken !== 'null') { setAuthLoading(true); try { apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`; const response = await apiClient.get('/auth/me'); setUser(response.data); setToken(currentToken); } catch (error) { handleLogout(); } finally { setAuthLoading(false); } } else { handleLogout(); setAuthLoading(false); } }, [handleLogout]);
    useEffect(() => { checkAuth(); }, [checkAuth]);

    // --- Fetch Appointments ---
    const fetchAppointments = useCallback(async (searchTerm) => { if (!user || !token) return; setLoadingAppointments(true); setAppError(''); try { const response = await apiClient.get('/appointments/my', { params: { search: searchTerm } }); setAppointments(response.data || []); } catch (error) { setAppError('Could not load appointments.'); setAppointments([]); } finally { setLoadingAppointments(false); } }, [user, token]);

    // --- Fetch Other Data ---
    const fetchOtherData = useCallback(async () => { if (!user || !token) return; setLoadingProviders(true); try { const [provRes, resRes, notifRes] = await Promise.allSettled([ apiClient.get('/providers'), apiClient.get('/resources'), apiClient.get('/notifications?limit=20') ]); if (provRes.status === 'fulfilled') setProviders(provRes.value.data || []); else setProviders([]); if (resRes.status === 'fulfilled') setResources(resRes.value.data || []); else setResources([]); if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data || []); else setNotifications([]); if ([provRes, resRes, notifRes].some(r => r.status === 'rejected')) { setAppError(prev => prev || 'Could not load some data.'); } } catch (error) { /* Handled */ } finally { setLoadingProviders(false); } }, [user, token]);

    // --- Combined Initial Data Fetch ---
    const runInitialFetch = useCallback(async () => { if (!user) return; setLoadingData(true); setLoadingAppointments(true); setAppError(''); try { await Promise.allSettled([ fetchAppointments(''), fetchOtherData() ]); } finally { setLoadingData(false); setLoadingAppointments(false); } }, [user, fetchAppointments, fetchOtherData]);
    useEffect(() => { runInitialFetch(); }, [runInitialFetch]); // Run when user changes (login/logout)

    // --- Debounced Search ---
    useEffect(() => { if (!user) return; if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); } searchTimeoutRef.current = setTimeout(() => { fetchAppointments(appointmentSearchTerm); }, 500); return () => { if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); } }; }, [appointmentSearchTerm, user, fetchAppointments]);

    // --- Auth Handler ---
    const handleAuthSuccess = (authData) => { if (!authData.token) { setAppError("Auth failed."); return; } localStorage.setItem('authToken', authData.token); apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`; setToken(authData.token); setUser(authData); setAppError(''); };

    // --- Data Update Handlers ---
    const fetchNotifications = useCallback(async () => { if (!user) return; try { const response = await apiClient.get('/notifications?limit=20'); setNotifications(response.data); } catch (error) { /* Ignore */ } }, [user]);
    const handleAppointmentBooked = () => { runInitialFetch(); }; // Refetch ALL after booking
    const handleCancelAppointment = async (id) => { setActionLoading(true); setAppError(''); try { await apiClient.put(`/appointments/${id}/status`, { status: 'Cancelled' }); runInitialFetch(); } catch (error) { setAppError(error.response?.data?.message || 'Could not cancel.'); } finally { setActionLoading(false); } };
    const handleMarkComplete = async (id) => { setActionLoading(true); setAppError(''); try { await apiClient.put(`/appointments/${id}/status`, { status: 'Completed' }); runInitialFetch(); } catch (error) { setAppError(error.response?.data?.message || 'Could not complete.'); } finally { setActionLoading(false); } };
    const handleRescheduleStart = (appointment) => { setAppointmentToReschedule(appointment); setIsRescheduleModalOpen(true); setAppError(''); };
    const handleRescheduleSubmit = async (appointmentId, newDateTimeISO, newReason) => { setActionLoading(true); setAppError(''); return apiClient.put(`/appointments/${appointmentId}`, { dateTime: newDateTimeISO, reason: newReason }).then(() => { runInitialFetch(); setIsRescheduleModalOpen(false); setAppointmentToReschedule(null); }).catch(error => { throw error; }).finally(() => { setActionLoading(false); }); };
    const handleResourceUpdate = async (id, newStatus) => { setActionLoading(true); setAppError(''); try { const response = await apiClient.put(`/resources/${id}/status`, { status: newStatus }); setResources(prev => prev.map(r => r.id === id ? response.data : r)); } catch (error) { setAppError(error.response?.data?.message || 'Could not update resource.'); } finally { setActionLoading(false); } };
    const handleMarkRead = async (id) => { try { await apiClient.patch(`/notifications/${id}/read`); setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); } catch (error) { /* Ignore */ } };
    const handleMarkAllRead = async () => { try { await apiClient.patch(`/notifications/read-all`); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch (error) { /* Ignore */ } };
    const handleAppointmentSearchChange = (event) => { setAppointmentSearchTerm(event.target.value); };

    // --- Render Logic ---
    if (authLoading) return <LoadingDisplay isLoading={true} text="Initializing Application..." />;

    return (
        <>
            <h1>Real Time Health Scheduler</h1>
             {user ? ( <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', background: '#e9ecef', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #dee2e6' }}> <span>Welcome, <strong>{user.name}</strong> ({user.role})! {user.specialization && `[${user.specialization}]`}</span> <button onClick={handleLogout} style={{ background: '#6c757d' }}>Logout</button> </div> ) : ( <AuthForm onAuthSuccess={handleAuthSuccess} /> )}
             <ErrorDisplay message={appError} />
            {user && (
                <div className="container">
                    {/* Column 1 */}
                    <div className="section">
                         <LoadingDisplay isLoading={loadingData && !actionLoading} text="Loading data..." />
                         <LoadingDisplay isLoading={actionLoading} text="Processing action..." />
                         {user.role === 'patient' && ( <><AppointmentForm providers={providers} onAppointmentBooked={handleAppointmentBooked} isLoadingProviders={loadingData}/> <hr style={{margin: '2rem 0'}}/></> )}
                         <div>
                            <h3>{user.role === 'patient' ? "Your Appointments" : "Your Schedule"}</h3>
                             <div style={{ marginBottom: '1rem' }}> <input type="text" id="appointment-search" placeholder="Search by name, reason, status, date..." value={appointmentSearchTerm} onChange={handleAppointmentSearchChange} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '100%', boxSizing:'border-box', maxWidth: '400px' }} disabled={loadingData || loadingAppointments} /> </div>
                             <LoadingDisplay isLoading={loadingAppointments && !actionLoading} text="Searching appointments..." />
                             {!loadingAppointments && ( <AppointmentList appointments={appointments} userRole={user.role} onCancelAppointment={handleCancelAppointment} onReschedule={handleRescheduleStart} onMarkComplete={handleMarkComplete} loading={actionLoading} /> )}
                         </div>
                         <hr style={{margin: '2rem 0'}}/>
                         <ResourceSummary resources={resources} loading={loadingData} />
                         {user.role === 'provider' && ( <><hr style={{margin: '1rem 0'}}/><ResourceList resources={resources} userRole={user.role} onUpdateStatus={handleResourceUpdate} loading={actionLoading || loadingData} /></> )}
                    </div>
                     {/* Column 2 */}
                     <NotificationList notifications={notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} loading={loadingData && !actionLoading}/>
                </div>
            )}
             <RescheduleModal isOpen={isRescheduleModalOpen} onClose={() => setIsRescheduleModalOpen(false)} appointment={appointmentToReschedule} onRescheduleSubmit={handleRescheduleSubmit} loading={actionLoading} />
        </>
    );
}

export default App; // Use default export