const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");

const app = express();
const port = 3003;

// Middleware setup
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Database', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, "Error in connecting to database"));
db.once('open', () => console.log("Connected to database"));

// User Schema
const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    dob: String,
    gender: String,
    mobile: String,
    email: String,
    rollNo: String,
    username: String,
    password: String,
    confirmpassword: String
});

const User = mongoose.model('User', userSchema);

// Job Schema
const jobSchema = new mongoose.Schema({
    companyName: String,
    branch: String,
    role: String,
    qualification: String,
    requiredSkill: String,
    extraSkill: String,
    maxAge: Number,
    jobLocation: String,
    salary: String,
    workingHour: Number,
    description: String,
    lastApplyDate: Date
});

const Job = mongoose.model('Job', jobSchema);

// Register route
app.post("/register", async (req, res) => {
    try {
        const userData = new User(req.body);
        await userData.save();
        console.log("Record Inserted Successfully");
        res.redirect('educationdetails.html'); // Redirect to education details page
    } catch (err) {
        console.error("Error in saving user data", err);
        res.status(500).send("Error in saving user data");
    }
});

// Education details route
app.post("/education", async (req, res) => {
    try {
        const data = {
            collegeName: req.body.collegeName,
            rollNo: req.body.rollNo,
            username: req.body.username,
            semester: req.body.semester,
            education: req.body.education,
            branch: req.body.branch,
            passingYear: req.body.passingYear,
            sgpa: req.body.sgpa,
            cgpa: req.body.cgpa,
            skill: req.body.skill,
            additionalSkills: req.body.additionalSkills,
            resume: req.body.resume
        };
        await db.collection('educationaldetails').insertOne(data);
        console.log("Record Inserted Successfully");
        res.redirect('student.html'); // Redirect to student dashboard
    } catch (err) {
        console.error("Error in inserting educational details", err);
        res.status(500).send("Error in inserting educational details");
    }
});

// Company details route
app.post("/company", async (req, res) => {
    try {
        const data = {
            companyName: req.body.companyName,
            contactPersonName: req.body.contactPersonName,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            pincode: req.body.pincode,
            mobile: req.body.mobile,
            email: req.body.email,
            companyWebsite: req.body.companyWebsite,
            username: req.body.username,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword,
        };
        await db.collection('companydetails').insertOne(data);
        console.log("Record Inserted Successfully");
        res.redirect('faculty.html'); // Redirect to faculty dashboard
    } catch (err) {
        console.error("Error in inserting company details", err);
        res.status(500).send("Error in inserting company details");
    }
});

const applicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);

// Login route for companies
app.post("/companylogin", async (req, res) => {
    const { username, password } = req.body;

    try {
        const company = await db.collection('companydetails').findOne({ username: { $regex: new RegExp(username, "i") } });
        if (!company || company.password !== password) {
            res.status(401).send("Invalid credentials");
            return;
        }
        res.redirect('companylogin.html'); // Change to the desired URL
    } catch (err) {
        console.error("Error in finding company", err);
        res.status(500).send("Error in finding company");
    }
});

// Login route for students
app.post("/studentlogin", async (req, res) => {
    const { username, password } = req.body;

    try {
        const student = await User.findOne({ username: { $regex: new RegExp(username, "i") } });
        if (!student || student.password !== password) {
            return res.status(401).send("Invalid credentials");
        }
        req.session.username = student.username; // Store username in session
        req.session.rollNo = student.rollNo; // Optionally store roll number or other info in session
        res.redirect('/studentlogin.html'); // Redirect to student dashboard
    } catch (err) {
        console.error("Error in finding student", err);
        res.status(500).send("Error in finding student");
    }
});

// Add job route
app.post('/addjob', async (req, res) => {
    try {
        const jobData = new Job(req.body);
        await jobData.save();
        res.status(200).send('Job posted successfully');
    } catch (err) {
        console.error('Failed to post the job', err);
        res.status(500).send('Failed to post the job');
    }
});


app.get('/viewjobs', async (req, res) => {
    try {
        const jobs = await Job.find(); // Assuming Job is your Job model
        res.json(jobs);
    } catch (error) {
        res.status(500).send('Error fetching jobs');
    }
});

// Fetch student profile details
app.get("/profile", async (req, res) => {
    try {
        const username = req.session.username;
        if (!username) {
            return res.status(401).send("Not logged in");
        }
        const student = await User.findOne({ username });
        if (!student) {
            return res.status(404).send("Student not found");
        }
        res.json(student);
    } catch (err) {
        console.error("Error in fetching student profile", err);
        res.status(500).send("Error in fetching student profile");
    }
});

// Search companies route
app.get('/api/companies', async (req, res) => {
    try {
        const { skill } = req.query;
        const companies = await Job.find({
            requiredSkill: { $regex: new RegExp(skill, "i") },
        });
        res.status(200).json(companies);
    } catch (err) {
        console.error('Failed to search companies', err);
        res.status(500).send('Failed to search companies');
    }
});

// Search students route
app.get('/api/students', async (req, res) => {
    try {
        const { category, skill, qualification } = req.query;
        const students = await db.collection('educationaldetails').find({
            branch: { $regex: new RegExp(category, "i") },
            skill: { $regex: new RegExp(skill, "i") },
            education: { $regex: new RegExp(qualification, "i") }
        }).toArray();
        res.status(200).json(students);
    } catch (err) {
        console.error('Failed to search students', err);
        res.status(500).send('Failed to search students');
    }
});

// Apply for a job route
app.post('/api/applyjob', async (req, res) => {
    try {
        const username = req.session.username;
        if (!username) {
            return res.status(401).send("Not logged in");
        }
        const student = await User.findOne({ username });
        if (!student) {
            return res.status(404).send("Student not found");
        }

        const { jobId } = req.body;
        const application = new Application({
            jobId,
            userId: student._id
        });
        await application.save();
        res.status(200).send('Applied for the job successfully');
    } catch (err) {
        console.error('Failed to apply for the job', err);
        res.status(500).send('Failed to apply for the job');
    }
});

// View applied jobs route
app.get('/api/appliedjobs', async (req, res) => {
    try {
        const username = req.session.username;
        if (!username) {
            return res.status(401).send("Not logged in");
        }
        const student = await User.findOne({ username });
        if (!student) {
            return res.status(404).send("Student not found");
        }

        const applications = await Application.find({ userId: student._id }).populate('jobId');
        res.status(200).json(applications);
    } catch (err) {
        console.error('Failed to retrieve applied jobs', err);
        res.status(500).send('Failed to retrieve applied jobs');
    }
});

// Root route
app.get("/", (req, res) => {
    res.set({ "Allow-access-Allow-Origin": '*' });
    res.redirect('index.html');
});
// Search jobs route
app.get('/api/jobs', async (req, res) => {
    try {
        const { skill } = req.query;
        const jobs = await Job.find({ requiredSkill: { $regex: new RegExp(skill, "i") } });
        res.status(200).json(jobs);
    } catch (err) {
        console.error('Failed to retrieve jobs', err);
        res.status(500).send('Failed to retrieve jobs');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
