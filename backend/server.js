// backend/server.js
// FINAL v8 - TRULY COMPLETE IMPLEMENTATION FOR ALL ROUTES
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./models');
const { body, validationResult, param, query } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Ensure roleMiddleware exists and exports isAdmin and checkRole
let isAdmin = (req, res, next) => { console.error("isAdmin middleware failed to load!"); next(new Error("Server config error: isAdmin missing")); };
let checkRole = (roles = []) => (req, res, next) => { console.error("checkRole middleware failed to load!"); next(new Error("Server config error: checkRole missing")); };
try {
    const roleMiddleware = require('./middleware/roleMiddleware');
    isAdmin = roleMiddleware.isAdmin || isAdmin;
    checkRole = roleMiddleware.checkRole || checkRole;
} catch (e) { console.warn("Warning: Could not load './middleware/roleMiddleware'. Admin/Role checks may fail.", e); }


// --- Global Error Handlers ---
process.on('uncaughtException', (error) => { console.error('!!! UNCAUGHT EXCEPTION !!!', error); process.exit(1); });
process.on('unhandledRejection', (reason, promise) => { console.error('!!! UNHANDLED REJECTION !!! Reason:', reason); });

dotenv.config();
const app = express();

// --- Middleware ---
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use((req, res, next) => { console.log(`[Request] ${new Date().toISOString()} ${req.method} ${req.path}`); next(); });

// --- Auth Middleware & Helpers ---
const protect = async (req, res, next) => { let token; if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) { try { token = req.headers.authorization.split(' ')[1]; const decoded = jwt.verify(token, process.env.JWT_SECRET); req.user = await db.User.findByPk(decoded.id, { attributes: ['id', 'name', 'email', 'role', 'specialization'] }); if (!req.user) throw new Error('User not found'); next(); } catch (error) { console.error("[Auth Error]", error.message); return res.status(401).json({ message: 'Not authorized, token failed' }); } } else { return res.status(401).json({ message: 'Not authorized, no token' }); } };
// checkRole defined via require/fallback above
const createNotification = async (recipientId, message, type = 'system', link = null) => { try { if (!recipientId) return; const recipientExists = await db.User.findByPk(recipientId); if (!recipientExists) return; await db.Notification.create({ recipientId, message, type, link }); console.log(`Notification created for ${recipientId}`); } catch (error) { console.error(`Notification failed for ${recipientId}:`, error); } };
const checkProviderAvailability = async (providerId, dateTime, excludeAppointmentId = null) => { const provider = await db.User.findByPk(providerId); if (!provider || provider.role !== 'provider') { throw new Error('Invalid provider.'); } const whereClause = { providerId: providerId, dateTime: dateTime, status: { [Op.in]: ['Upcoming', 'In-Progress'] } }; if (excludeAppointmentId) { whereClause.id = { [Op.ne]: excludeAppointmentId }; } const existing = await db.Appointment.findOne({ where: whereClause }); if (existing) { throw new Error('Time slot not available.'); } return true; }

// --- Routes ---

// AUTH
app.post('/api/auth/register', [ body('name').notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 }), body('role').isIn(['patient', 'provider']), body('specialization').if(body('role').equals('provider')).notEmpty().trim().escape() ], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const { name, email, password, role, specialization } = req.body; console.log(`[Register Attempt] Email: ${email}, Role: ${role}`); try { const emailLower = email.toLowerCase(); if (await db.User.findOne({ where: { email: emailLower } })) return res.status(400).json({ message: 'Email already exists' }); const user = await db.User.create({ name, email: emailLower, password, role, specialization: role === 'provider' ? specialization : null }); const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' }); const userResponse = await db.User.findByPk(user.id); console.log(`[Register Success] User created: ${user.id}`); res.status(201).json({ ...userResponse.toJSON(), token }); } catch (error) { console.error("[Register Error]:", error); next(error); } });
app.post('/api/auth/login', [ body('email').isEmail().normalizeEmail(), body('password').notEmpty() ], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const { email, password } = req.body; console.log(`[Login Attempt] Email: ${email}`); try { const user = await db.User.scope('withPassword').findOne({ where: { email: email.toLowerCase() } }); if (!user) { console.warn(`[Login Fail] User not found: ${email}`); return res.status(401).json({ message: 'Invalid credentials' }); } const isMatch = await user.matchPassword(password); console.log(`[Login Check] Password match for ${email}: ${isMatch}`); if (isMatch) { const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' }); const userResponse = await db.User.findByPk(user.id); console.log(`[Login Success] User logged in: ${user.id}`); res.json({ ...userResponse.toJSON(), token }); } else { console.warn(`[Login Fail] Invalid password for email: ${email}`); res.status(401).json({ message: 'Invalid credentials' }); } } catch (error) { console.error("[Login Error]:", error); next(error); } });
app.get('/api/auth/me', protect, (req, res) => { console.log(`[Auth Me] Responding for user: ${req.user?.id}`); res.json(req.user); });

// PROVIDERS
app.get('/api/providers', protect, async (req, res, next) => { console.log(`[API GET /providers] Request from user ${req.user.id}`); try { const providers = await db.User.findAll({ where: { role: 'provider' }, attributes: ['id', 'name', 'specialization'], order: [['name', 'ASC']] }); console.log(`[API GET /providers] Found ${providers.length} providers.`); res.json(providers); } catch (error) { console.error("[API GET /providers] Error:", error); next(error); } });

// APPOINTMENTS
app.post('/api/appointments', protect, checkRole(['patient']), [ body('providerId').isInt(), body('dateTime').isISO8601().toDate(), body('reason').optional({nullable: true, checkFalsy: true}).isString().trim().escape() ], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const { providerId, dateTime, reason } = req.body; const patientId = req.user.id; try { const appointmentTime = new Date(dateTime); if (appointmentTime < new Date()) { return res.status(400).json({ message: 'Cannot book in past.' }); } await checkProviderAvailability(providerId, appointmentTime); const provider = await db.User.findByPk(providerId); if (!provider || provider.role !== 'provider') return res.status(400).json({ message: 'Invalid provider.' }); const appointment = await db.Appointment.create({ patientId, providerId, dateTime: appointmentTime, reason, status: 'Upcoming' }); const populatedAppt = await db.Appointment.findByPk(appointment.id, { include: ['patient', 'provider']}); createNotification(patientId, `Booked with ${provider.name} on ${appointmentTime.toLocaleString()}.`, 'appointment'); createNotification(providerId, `Booked by ${req.user.name} on ${appointmentTime.toLocaleString()}.`, 'appointment'); res.status(201).json(populatedAppt); } catch (error) { console.error("Booking Error:", error); if (error.message.includes('Provider is not available') || error.message.includes('Invalid provider')) { res.status(400).json({ message: error.message }); } else { next(error); } } });
app.get('/api/appointments/my', protect, [ query('search').optional().isString().trim().escape() ], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const searchTerm = req.query.search || ''; console.log(`[API GET /appointments/my] User ${req.user.id} (${req.user.role}). Search: "${searchTerm}"`); try { let userWhereClause = {}; if (req.user.role === 'patient') { userWhereClause.patientId = req.user.id; } else if (req.user.role === 'provider') { userWhereClause.providerId = req.user.id; } else if (req.user.role !== 'admin') { return res.status(403).json({ message: 'Role not applicable' }); } let specificSearchWhereClause = {}; if (searchTerm) { let dateSearchCondition = null; if (/^\d{4}-\d{2}-\d{2}$/.test(searchTerm)) { const searchDate = new Date(searchTerm + 'T00:00:00.000Z'); if (!isNaN(searchDate.getTime())) { const startOfDay = new Date(searchDate); startOfDay.setUTCHours(0, 0, 0, 0); const endOfDay = new Date(searchDate); endOfDay.setUTCHours(23, 59, 59, 999); dateSearchCondition = { dateTime: { [Op.between]: [startOfDay, endOfDay] } }; } } if (dateSearchCondition) { specificSearchWhereClause = dateSearchCondition; } else { const likeTerm = `%${searchTerm}%`; specificSearchWhereClause = { [Op.or]: [ { '$patient.name$': { [Op.like]: likeTerm } }, { '$provider.name$': { [Op.like]: likeTerm } }, { reason: { [Op.like]: likeTerm } }, { status: { [Op.like]: likeTerm } } ] }; } } const finalWhereClause = { ...userWhereClause, ...specificSearchWhereClause }; const appointments = await db.Appointment.findAll({ where: finalWhereClause, include: [ { model: db.User, as: 'patient', attributes: ['id', 'name'], required: false }, { model: db.User, as: 'provider', attributes: ['id', 'name', 'specialization'], required: false } ], order: [['dateTime', 'DESC']] }); console.log(`[API GET /appointments/my] Found ${appointments.length} appts for user ${req.user.id}. Search: "${searchTerm}".`); res.json(appointments); } catch (error) { console.error("[API GET /appointments/my] Error:", error); next(error); } });
app.get('/api/appointments/:id', protect, [param('id').isInt()], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); try { const appointment = await db.Appointment.findByPk(req.params.id, { include: ['patient', 'provider'] }); if (!appointment) return res.status(404).json({ message: 'Not found' }); const isPatient = req.user.id === appointment.patientId; const isProvider = req.user.id === appointment.providerId; const isAdminUser = req.user.role === 'admin'; if (!isPatient && !isProvider && !isAdminUser) { return res.status(403).json({ message: 'Not authorized' }); } res.json(appointment); } catch(error) { next(error); } });
app.put('/api/appointments/:id/status', protect, [ param('id').isInt(), body('status').isIn(['Completed', 'Cancelled']) ], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const appointmentId = req.params.id; const requestedStatus = req.body.status; const userId = req.user.id; const userRole = req.user.role; console.log(`[PUT /appointments/${appointmentId}/status] User ${userId} -> ${requestedStatus}`); try { const appointment = await db.Appointment.findByPk(appointmentId, { include: ['patient', 'provider'] }); if (!appointment) return res.status(404).json({ message: 'Not found' }); const isProvider = userRole === 'provider' && userId === appointment.providerId; const isPatient = userRole === 'patient' && userId === appointment.patientId; if (!isProvider && !isPatient) { return res.status(403).json({ message: 'Not authorized' }); } if (isPatient && requestedStatus !== 'Cancelled') { return res.status(403).json({ message: 'Patients can only cancel.' }); } if (isProvider && !['Completed', 'Cancelled'].includes(requestedStatus)) { return res.status(400).json({ message: 'Invalid status for provider.' }); } if (appointment.status !== 'Upcoming') { return res.status(400).json({ message: `Already ${appointment.status}.` }); } const oldStatus = appointment.status; appointment.status = requestedStatus; await appointment.save(); const populatedAppt = appointment; if (oldStatus !== appointment.status) { if (appointment.status === 'Cancelled') { const by = isPatient ? "patient" : "provider"; createNotification(appointment.patientId, `Appt on ${new Date(appointment.dateTime).toLocaleString()} cancelled.`, 'appointment'); createNotification(appointment.providerId, `Appt on ${new Date(appointment.dateTime).toLocaleString()} cancelled by ${by}.`, 'appointment'); } else if (appointment.status === 'Completed' && isProvider) { createNotification(appointment.patientId, `Appt on ${new Date(appointment.dateTime).toLocaleString()} completed.`, 'appointment'); } } console.log(`[PUT /appointments/${appointmentId}/status] Success.`); res.json(populatedAppt); } catch (error) { console.error(`[PUT /appointments/:id/status] Error:`, error); next(error); } });
app.put('/api/appointments/:id', protect, checkRole(['patient']), [ param('id').isInt(), body('dateTime').isISO8601().toDate(), body('reason').optional({nullable: true, checkFalsy: true}).isString().trim().escape() ], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const appointmentId = req.params.id; const { dateTime, reason } = req.body; const patientId = req.user.id; try { const appointment = await db.Appointment.findByPk(appointmentId, { include: ['patient', 'provider'] }); if (!appointment) return res.status(404).json({ message: 'Not found' }); if (appointment.patientId !== patientId) { return res.status(403).json({ message: 'Not authorized' }); } if (appointment.status !== 'Upcoming') { return res.status(400).json({ message: `Cannot reschedule ${appointment.status} appt.` }); } const newTime = new Date(dateTime); if (newTime < new Date()) { return res.status(400).json({ message: 'Cannot reschedule to past.' }); } if (newTime.getTime() === new Date(appointment.dateTime).getTime()) { return res.status(400).json({ message: 'New time is same.' }); } await checkProviderAvailability(appointment.providerId, newTime, appointment.id); const oldDateTime = new Date(appointment.dateTime); appointment.dateTime = newTime; appointment.reason = reason !== undefined ? reason : appointment.reason; await appointment.save(); const updatedAppt = await db.Appointment.findByPk(appointment.id, { include: ['patient', 'provider']}); const fOld = oldDateTime.toLocaleString(); const fNew = newTime.toLocaleString(); createNotification(patientId, `Appt rescheduled from ${fOld} to ${fNew}.`, 'appointment'); createNotification(appointment.providerId, `Appt with ${updatedAppt.patient.name} rescheduled from ${fOld} to ${fNew}.`, 'appointment'); res.json(updatedAppt); } catch (error) { console.error("Reschedule Error:", error); if (error.message.includes('Provider is not available')) { return res.status(400).json({ message: error.message }); } next(error); } });
app.put('/api/appointments/:id/notes', protect, checkRole(['provider']), [ param('id').isInt(), body('notes', 'Notes required').notEmpty().isString().trim().escape() ], async (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const appointmentId = req.params.id; const { notes } = req.body; try { const appointment = await db.Appointment.findOne({ where: { id: appointmentId, providerId: req.user.id } }); if (!appointment) return res.status(404).json({ message: 'Not found or not yours.' }); if (appointment.status !== 'Completed') { return res.status(400).json({ message: 'Notes only on completed appts.' }); } appointment.providerNotes = notes; await appointment.save(); res.json({ id: appointment.id, providerNotes: appointment.providerNotes }); } catch (error) { console.error("Update Notes Error:", error); next(error); } });

// RESOURCES
app.get('/api/resources', protect, async (req, res, next) => {
    console.log(`[API GET /resources] Request from user ${req.user.id}`);
    try { const resources = await db.Resource.findAll({ order: [['name', 'ASC']] }); console.log(`[API GET /resources] Found ${resources.length} resources.`); res.json(resources); }
    catch (error) { console.error("[API GET /resources] Error:", error); next(error); }
});
app.put('/api/resources/:id/status', protect, checkRole(['provider', 'admin']), [
    param('id', 'Resource ID must be integer').isInt(), body('status', 'Status must be Available or Occupied').isIn(['Available', 'Occupied'])
], async (req, res, next) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const resourceId = req.params.id; const requestedStatus = req.body.status; console.log(`[API PUT /resources/${resourceId}/status] User ${req.user.id} -> ${requestedStatus}`);
    try { const resource = await db.Resource.findByPk(resourceId); if (!resource) return res.status(404).json({ message: 'Resource not found' }); resource.status = requestedStatus; await resource.save(); console.log(`[API PUT /resources/${resourceId}/status] Success.`); res.json(resource); }
    catch (error) { console.error(`[API PUT /resources/:id/status] Error:`, error); next(error); }
});
app.post('/api/resources', protect, isAdmin, [
    body('name', 'Name required').notEmpty().trim().escape(), body('type', 'Type required').notEmpty().trim().escape(), body('status').optional().isIn(['Available', 'Occupied']),
], async (req, res, next) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const { name, type, status } = req.body; console.log(`[API POST /resources] Admin ${req.user.id} creating resource: ${name}`);
    try { if (await db.Resource.findOne({ where: { name } })) return res.status(400).json({ message: `Resource name '${name}' already exists.` }); const resource = await db.Resource.create({ name, type, status: status || 'Available' }); console.log(`[API POST /resources] Success. ID: ${resource.id}`); res.status(201).json(resource);
    } catch (error) { console.error("[API POST /resources] Error:", error); next(error); }
});
app.delete('/api/resources/:id', protect, isAdmin, [ param('id').isInt() ], async (req, res, next) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const resourceId = req.params.id; console.log(`[API DELETE /resources/${resourceId}] Request from admin ${req.user.id}`);
    try { const resource = await db.Resource.findByPk(resourceId); if (!resource) return res.status(404).json({ message: 'Resource not found' }); await resource.destroy(); console.log(`[API DELETE /resources/${resourceId}] Success.`); res.status(200).json({ message: 'Resource deleted' });
    } catch (error) { console.error(`[API DELETE /resources/:id] Error:`, error); next(error); }
});

// NOTIFICATIONS
app.get('/api/notifications', protect, [ query('limit').optional().isInt({ min: 1, max: 50 }).toInt(), query('read').optional().isBoolean() ], async (req, res, next) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); console.log(`[API GET /notifications] Fetching for user ${req.user.id}`);
    try { const whereClause = { recipientId: req.user.id }; if (req.query.read !== undefined) whereClause.read = req.query.read === 'true'; const limit = req.query.limit || 15; const notifications = await db.Notification.findAll({ where: whereClause, order: [['createdAt', 'DESC']], limit: limit }); console.log(`[API GET /notifications] Found ${notifications.length} notifications.`); res.json(notifications);
    } catch (error) { console.error("[API GET /notifications] Error:", error); next(error); }
});
app.patch('/api/notifications/:id/read', protect, [ param('id').isInt() ], async (req, res, next) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); const notificationId = req.params.id; console.log(`[API PATCH /notifications/${notificationId}/read] Request from user ${req.user.id}`);
    try { const result = await db.Notification.update( { read: true }, { where: { id: notificationId, recipientId: req.user.id, read: false } }); if (result[0] > 0) { res.status(200).json({ message: 'Marked as read' }); } else { const exists = await db.Notification.findOne({ where: { id: notificationId, recipientId: req.user.id } }); if (!exists) { res.status(404).json({ message: 'Not found.' }); } else { res.status(200).json({ message: 'Already read.' }); } }
    } catch (error) { console.error("[API PATCH /notifications/:id/read] Error:", error); next(error); }
});
app.patch('/api/notifications/read-all', protect, async (req, res, next) => {
    console.log(`[API PATCH /notifications/read-all] Request from user ${req.user.id}`);
    try { const result = await db.Notification.update( { read: true }, { where: { recipientId: req.user.id, read: false } }); res.json({ message: `Marked ${result[0]} as read.` });
    } catch (error) { console.error("[API PATCH /notifications/read-all] Error:", error); next(error); }
});

// ADMIN User List
app.get('/api/users', protect, isAdmin, async (req, res, next) => {
    console.log(`[API GET /users] Request from admin ${req.user.id}`);
    try { const users = await db.User.findAll({ attributes: ['id', 'name', 'email', 'role', 'specialization', 'createdAt'], order: [['name', 'ASC']] }); console.log(`[API GET /users] Found ${users.length} users.`); res.json(users);
    } catch (error) { console.error("[API GET /users] Error:", error); next(error); }
});

// --- Central Error Handler ---
app.use((err, req, res, next) => { console.error("! SERVER ERROR:", err.name, "-", err.message); console.error(err.stack); let statusCode = 500; let message = 'Server error.'; if (err.name?.includes('Sequelize')) { statusCode = 400; message = err.errors?.map(e => e.message).join(', ') || err.message; } else if (err.status) { statusCode = err.status; } res.status(statusCode).json({ message: message }); });

// --- Start Server ---
const PORT = process.env.PORT || 5003;
db.sequelize.authenticate()
  .then(() => { console.log('DB connection OK.'); app.listen(PORT, () => console.log(`--- Server running on port ${PORT} ---`)); })
  .catch(err => { console.error('!!! DB Connection Error:', err); process.exit(1); });