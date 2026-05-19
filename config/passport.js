const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcryptjs");
const user = require("../queries/user");

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const foundUser = await user.findByUsername(username)

      if (!foundUser) {
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, foundUser.password);

      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      }
      return done(null, foundUser);
    } catch(err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const foundUser = await user.findById(id);
    done(null, foundUser);
  } catch(err) {
    done(err);
  }
});

module.exports = passport