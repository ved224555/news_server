require('dotenv').config()
// const bodyParser = require('body-parser');
// const ejs = require('ejs');
// const https = require('https');
// const { verify } = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
var express = require('express');
var path = require('path');
var cors = require('cors')
var app = express();
const jwt = require('jsonwebtoken');
const saltRounds = 10;
var cookieParser = require('cookie-parser');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cookieParser()); 

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true});

// -------------------------------------DataBase for the projects-----------------------------------
// Schema for projects
const memberSchema = new mongoose.Schema({
  username : String,
  emailId : String,
  password : String,
  confirm_password: String,
  date:{
    type: Date,
    default: Date.now
  },
  queries: [{
    title: String,
    message: String,
  }],
  tokens: [{
    token: String
  }]
});


memberSchema.methods.generateAuthToken = async function () {
  try{
    let token = jwt.sign({_id: this._id}, process.env.SECRET_KEY);
    this.tokens = this.tokens.concat({token: token });
    await this.save();
    return token;
  }
  catch (err){
    console.log(err);
  }
}

memberSchema.methods.addUserQueries = async function (title , message) {
  try{
    this.queries = this.queries.concat({title , message});
    await this.save();
    return this.queries;
  }
  catch(err){
    console.log(err);
  }
}

const Member = mongoose.model("Member",memberSchema);

//-----------------------------------------------GET ROUTE-------------------------------------------
const  authenticateUser = async (req , res , next ) => {
  try{
    const token = req.cookies.jwtoken;
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);

    const rootUser = await Member.findOne({_id: verifyToken._id, "tokens.token" : token});
    if(!rootUser){throw new Error('User not found')};

    req.token = token;
    req.rootUser = rootUser;
    req.UserId = rootUser._id;
    next();
  }
  catch (err){
    res.status(401).send("Unauthorized: No token is provided")
    console.log(err);
  }
}
app.get('/dashboard',authenticateUser,async function(req,res){
  res.send(req.rootUser);
})
app.get('/logout',function(req,res){
 res.clearCookie('jwtoken',{path:'/'});
 res.status(200).send("User Logout");
})


//------------------------------------------------POST ROUTE------------------------------------------------------
app.post('/register',function(req,res){

  const cPassword = req.body.confirm_password;
  const Password = req.body.password;
  if(cPassword != Password)
  return res.status(422).json({ error:"Please fill the entry properly"});
  

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const member = new Member({
      username : req.body.username,
      emailId : req.body.email,
      password : hash,
      confirm_password: hash
    })
    member.save();
    res.send({result:"data register successfully"});
    
});
  
})
app.post('/login',async function(req,res){
 
 try{ const Username =req.body.username;
  const Password = req.body.password; 
  if(!Username || !Password)
  return res.status(400).json({ error:"Please fill the entry properly"});
  
  const userLogin = await Member.findOne({username:Username});

  if(userLogin){
    const isMatch = await bcrypt.compare(Password, userLogin.password);
     
   const token = await userLogin.generateAuthToken();
   
    res.cookie('jwtoken', token, { sameSite: 'none', secure: true, httpOnly:true });

      if(isMatch === true)
     { res.json({message:"User sign in successfully"});
      }
      else
     { res.status(400).json({error:"Invalid Credentials"})}

  }}
  catch (err){console.log(err);}
})
app.post('/dashboard',async function(req,res){
try{
  const {username ,title , message} =req.body;
  if(!title || !message)
  {console.log("error please fill the proper query");
  return res.json({error:"Please fill the proper query"});}

   const userLogin = await Member.findOne({username:username});

   if(userLogin)
   {const addQuery = await userLogin.addUserQueries(title,message);
   await userLogin.save();
  res.status(201).json({message:"user query added successfully"});}
}
catch(err){
  console.log(err);
}

})

/*--------------------------------------LISTEN PORT---------------------------------------------*/

// if(process.env.NODE_ENV === "production"){
//   app.use(express.static("build"));
// }
var port = normalizePort(process.env.PORT || '5000');
app.listen(port,function(req,res){
  console.log("Server started at port 5000")
})



