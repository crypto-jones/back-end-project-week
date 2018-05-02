const router = require('express').Router();
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const Note = require('./noteModel');
const User = require('../users/userModel');

const path = process.env.MONGOLAB_URI || 'mongodb://localhost/notes';

router.use(
  session({
    name: 'auth',
    secret: 'you shall not pass!!',
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 1 * 24 * 60 * 60 * 1000 },
    secure: false,
    store: new MongoStore({
      url: path,
      ttl: 10 * 60
    })
  })
);

router
  .route('/')

  // Read Notes
  .get((req, res) => {
    Note.find({})
      .then(notes => {
        res.status(200).json(notes);
      })
      .catch(err => {
        res.status(500).json({
          errorMessage: 'The notes could not be retrieved.'
        });
      });
  })

  // Create Note
  .post((req, res) => {
    const { title, content } = req.body;
    const note = new Note({ title, content });
    console.log(note);
    if (!title || !content) {
      res.status(400).json({
        errorMessage: 'Please provide title and content for the note.'
      });
    }
    note
      .save()
      .then(savedNote => {
        console.log(req.session.name);
        User.find({ username: req.session.name })
          .then(user => {
            user[0].notes.push(savedNote);
            user[0]
              .save()
              .then(user => {
                res.status(201).json({
                  message:
                    'The user was saved to the db and the note was added.'
                });
              })
              .catch(err => {
                res
                  .status(500)
                  .json({ errorMessage: 'The user could not be saved.' });
              });
          })
          .catch(err => {
            res
              .status(500)
              .json({ errorMessage: 'There was an error finding the user' });
          });
      })
      .catch(err => {
        res.status(500).json({
          errorMessage: 'There was an error saving the note.',
          error: err
        });
      });
  });

router
  .route('/:id')

  // Read Friend by ID
  .get((req, res) => {
    Note.findById(req.params.id)
      .then(note => {
        if (note === null) {
          res.status(404).json({
            errorMessage: 'The note with the specified ID does not exist.'
          });
        }
        res.status(200).json(note);
      })
      .catch(err => {
        res
          .status(500)
          .json({ errorMessage: 'The note could not be retrieved.' });
      });
  })

  // Delete Note by ID
  .delete((req, res) => {
    Note.findByIdAndRemove(req.params.id)
      .then(note => {
        if (note === null) {
          res.status(404).json({
            errorMessage: 'The note with the specified ID does not exist'
          });
        }
        res.status(200).json(note);
      })
      .catch(err => {
        res
          .status(500)
          .json({ errorMessage: 'The note could not be removed.' });
      });
  })

  // Update Note by ID
  .put((req, res) => {
    const { id } = req.params;
    const update = req.body;
    const { title, content } = update;

    Note.findByIdAndUpdate(id, update)
      .then(note => {
        if (note === null) {
          res.status(404).json({
            errorMessage: 'The note with the specified ID does not exist.'
          });
        } else if (!title || !content) {
          res.status(400).json({
            errorMessage: 'Please provide title and content for the note.'
          });
        }
        res.status(200).json(update);
      })
      .catch(err => {
        res
          .status(500)
          .json({ errorMessage: 'The note could not be modified.' });
      });
  });

module.exports = router;
