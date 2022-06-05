//jshint esversion:6

//WHATEVER WE WRITE FOR PASSPORT JS BE SURE TO CHECK THE POSITIONS AND COPY ALL OF THAT EXACTLY SAME IN YOUR NEXT PROJECT

require('dotenv').config();  //for environment variables, zero-dependency module that loads environment variables from a .env file into process.env. In the .env file we have our environment variables
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");  //we use const everywhere because we are using esversion:6
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

console.log(process.env.API_KEY);


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({    //check documentation
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());  //we tell our app to initialize passport package
app.use(passport.session());   //and to also use passport for dealing with the sessions

// mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true});

mongoose.connect("mongodb+srv://kalpit10:Nvidiagtx1650@authentication.omtyt.mongodb.net/?retryWrites=true&w=majority/userDB", {useNewUrlParser:true});


//FOR USING BUTTONS FOR GOOGLE, FACEBOOK ETC WHEN LOGIN GO TO SOCIALBUTTONS FOR BOOTSTRAP AND DOWNLOAD THAT ZIP FILE AND DRAG THE FILE OF BOOTSTRAP SOCAIL.CSS IN THE CSS FOLDER.


const userSchema = new mongoose.Schema({  //new definition because of mongoose encryption
  email: String,
  password: String,
  googleID: {
    type: String,
      require: true,
      index:true,
      unique:true,
      sparse:true
  },
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({  //documentation for passportjs oauth20
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets10.herokuapp.com/auth/google/secrets"   //redirected url link that we created in credentials
  },
  // function(accessToken, refreshToken, profile, cb) {  //accessToken allows to get data related to that user,refreshToken allows to use the data for a longer period of time and their profile
  //   console.log(profile);
  //   User.findOrCreate({ googleId: profile.id }, function (err, user) {  //we first find the google id of that profile if it is there then bingo! if not then create one.
  //     return cb(err, user); //findOrCreate is a made up function made by passportjs and we will not be able to find the documentation for the same. there is a npm package so that this function works we need to install it.
  //   });
  // }
  function(accessToken, refreshToken, profile, cb){
        console.log(profile);
        //install and require find or create to make following function work
        User.findOrCreate({
            googleId: profile.id,
            username: profile.displayName //changes here from udemy doubts section
        }, function(err, user){
            return cb(err, user);
        });
    }
));


//when we write this GoogleStrategy code from documentation we should click on github link on that page and go to issues and read the issues if we are facing any we can get the solution from there.

app.get("/", function(req, res){
  res.render("home");
});

//type of authentication is GoogleStrategy and scope tells us that we want user's profile
app.route("/auth/google")
  .get(passport.authenticate('google', { scope: ['profile']
  }));

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});


app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res) {
  User.find({"secret": {$ne: null}}, function(err, foundUsers){  //its going to look through all of our user's collection, look through the secret fields and pick out the secrets field which is ne(not equal) to null
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;  //go to submit.ejs file and under the div tag form group check the name of input tag it is secret thats'a why we are targetting secret

  console.log(req.user.id);

  User.findById(req.user.id, function(err, founduser){
    if(err){
      console.log(err);
    }else{
      if(founduser){
        founduser.secret = submittedSecret;
        founduser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

app.post("/register", function(req, res){

User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    res.redirect("/");
  }else{
    passport.authenticate("local")(req, res, function(){ //type of authentication is local and callback function is triggerred when authentication is a success
      res.redirect("/secrets");
    });
  }
}); //register method comes with passportLocalMongoose package.

});

app.post("/login", function(req, res){

const user = new User({
  username: req.body.username,
  password: req.body.password
});

req.login(user, function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req, res, function(){  //if we login successfully we are going to send the cookie and tell our browser to hold on to that cookie, cookie tells that user is authorized
      res.redirect("/secrets");
    });
  }
});

});


//
// let port = process.env.PORT;
// if (port == null || port == "") {
//   port = 4000;
// }

app.listen(4000, function () {
  console.log("Server has started successfully.");
});
