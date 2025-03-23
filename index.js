const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({ username: String });
const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String,
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);


app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const user = new User({ username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const user = await User.findById(_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const exercise = new Exercise({
    userId: _id,
    description,
    duration: Number(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
  });

  await exercise.save();
  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: user._id,
  });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    // Find the user
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch all exercises for the user
    let exercises = await Exercise.find({ userId: _id }).select('description duration date');

    // Manually filter by 'from' and 'to' since dates are stored as strings
    if (from) {
      const fromDate = new Date(from); // Convert input to matching format
      exercises = exercises.filter(ex => new Date(ex.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to); // Convert input to matching format
      exercises = exercises.filter(ex => new Date(ex.date) <= toDate);
    }

    // Apply limit if provided
    if (limit && !isNaN(limit)) {
      exercises = exercises.slice(0, Number(limit));
    }

    // Format response
    const formattedExercises = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: new Date(ex.date).toDateString(), // Ensure date consistency
    }));

    // Return response
    res.json({
      username: user.username,
      count: formattedExercises.length,
      _id: user._id,
      log: formattedExercises,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
