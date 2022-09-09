
/* Importing all the dependencies */

require('dotenv').config()
const port = process.env.PORT || 3000
const email = process.env.EMAIL
const pass = process.env.PASS
const API_TOKEN = process.env.API_TOKEN
const key = process.env.SECRET_KEY
const db = require("./config/database");
const express = require('express')
const mailer = require('nodemailer')
const fs = require('fs')
const app = express()
const http = require('http').Server(app)
const {checkSpaces} = require('some-random-form-validator')
const { Telegraf,Markup } = require('telegraf')
const bot = new Telegraf(API_TOKEN)
const sender = mailer.createTransport({
	service: 'gmail',
	auth: {
		user: email,
		pass: pass
	}
})
const bcrypt = require("bcryptjs")
const saltRounds=10
const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET_KEY
const cookieParser=require('cookie-parser')
const multer = require('multer')

let online={}

const excludedRoutes = ['/static', '/']
/* middlewares */

app.use(cookieParser());
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './uploads/')
	},
	filename: function (req, file, cb) {
				let extArray = file.mimetype.split("/");
				let extension = extArray[extArray.length - 1];
				cb(null, file.originalname + '-' + Date.now()+ '-.' +extension)
	},
})

const upload = multer({ storage: storage })

app.use( async (req, res, next) => {
	const url = req.originalUrl.split("?")[0]
	if(excludedRoutes.includes(url)){
		next()
	}else{
		const token = req.cookies.token
		const authData = await verifyToken(token)
		if (!authData.result){
			if(req.method=="GET"){
				res.redirect(`http://${req.header('host')}/auth/login`)
			} else{
				res.status(401).json({status:false,msg:"unauthorised access"})
			}
			return
		}
		else{
			req.usrProf = authData.data
			next()
		}
	}}
)

app.use('/static',express.static(__dirname + "/static"))
if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}
app.use(express.json());
app.use(express.urlencoded({
	extended: true
}))

/* Express server stuff*/

app.get('/',(req,res)=>{
	res.sendFile(__dirname+'/login.html')
})

app.get('/new-user',(req,res)=>{
	res.sendFile(__dirname+'/signup.html')
})

app.get('/dashboard',(req,res)=>{
	res.sendFile(__dirname+'/index.html')
})

/* Signup Endpoint */

app.post("/add-new-user",async (req,res)=>{
	const code = req.body.code
	if(code!=key){
		res.send({status:false,code:true,result:"incorrect referral"})
		return
	}
	const userquery = `
	SELECT * FROM users WHERE username = $1;
	`;
	const uservalues = [req.body.user];
	const dupUser = await db.query(userquery, uservalues);
	if( dupUser.rows.length!=0){
		res.send({status:false,user:true,result:"user exists"})
		return
	}
	const emailquery = `
	SELECT * FROM users WHERE email = $1;
	`;
	const emailvalues = [req.body.email];
	const dupEmail = await db.query(emailquery, emailvalues);
	if( dupEmail.rows.length!=0){
		res.send({status:false,email:true,result:"email exists"})
		return
	}
	const query = `
	INSERT INTO users (username,fname,lname,email,pass,uid) 
	VALUES($1,$2,$3,$4,$5,$6)
	RETURNING *;
	`;
	var passhash
	await bcrypt.hash(req.body.pass, saltRounds).then(function(hash) {
		passhash=hash
	});
	const values = [req.body.user, req.body.fname,req.body.lname,req.body.email,passhash,generateUid()];
	const { rows } = await db.query(query, values)
	res.send({status:true})
})

/* Login Endpoint */

app.post("/let-me-in",async (req,res)=>{
	const query = `
	SELECT * FROM users WHERE username = $1;
	`;
	const values = [req.body.user];
	const { rows } = await db.query(query, values);
	if(rows.length==0){
		res.send({status:false,result:"wrong username or password"})
	}else{
		const match = await bcrypt.compare(req.body.pass, rows[0].pass)
		if(match){
			const token = jwt.sign({
				data:rows[0].uid
			}, secret, { expiresIn: '7d' })
			var expiryDate = new Date(Number(new Date()) + (7*24*3600000));
			res.setHeader("Set-Cookie", `token=${token};expires=${expiryDate}; Path=/;HttpOnly`)

			res.send({status:true})
		}
		else{
			res.send({status:false,result:"wrong username or password"})
		}
	}
})

/* Endpoint for Big Red SOS button */

app.post('/emergency',async (req,res)=>{
	const name = req.body.name
	const user = req.body.user
	const loc = req.body.loc
	const token = req.cookies.token
	const authData = await verifyToken(token)
	if(!authData.result){
		res.status(200).json({status:false})
		return
	}
	sendTgLoc(name,loc,user)
	//	sendAudio()
	sendBulkMail(user,loc,name)
	res.status(200).json({status:true})
})

/* Endpoint for Emergency Message just below the SOS button  */

app.post('/sosMsg',async (req,res)=>{
	const token = req.cookies.token
	const authData = await verifyToken(token)
	if(!authData.result){
		res.status(200).json({status:false})
		return
	}
	const msg = req.body.msg
	const name = req.body.name
	const user = req.body.user
	const loc = req.body.loc
	sendTgMsg(name,msg,loc,user)
	//	sendAudio()
	res.status(200).json({status:true})
})


/* Uplaod Image endpoint */

app.post('/upload-image',upload.single('img'),async (req,res)=>{
	const fname = req.file.filename
	let {caption, loc } = req.body
	const status = await sendTgImg(fname, req.usrProf.username, caption, JSON.parse(loc))
	if(status){
		res.json({status:true})

	}else{
		res.json({status:false})
	}
})



/* Logout Endpoint */

app.get('/log-me-out',(req,res)=>{
	res.clearCookie("token")
	res.json({status:true})
})

/* Verifies that the current user is valid and logged in Successfully */

app.get('/checkAuth',async (req,res)=>{
	const token = req.cookies.token
	const authData = await verifyToken(token)
	res.status(200).json({result:authData.result,data:
		authData.result ? 
		{
			fname:authData.data.fname,
			lname:authData.data.lname,
			username:authData.data.username,
			email:authData.data.email,
		}
		:{}
	})
})

/* Check duplicate entries during Signup Process and tells Users that email/user exists */

app.post('/checkDup', async (req,res)=>{
	const toCheck=req.body.email ? "email" : "username"
	const query = `SELECT * FROM users WHERE ${toCheck} = $1;`;
	const value = [req.body.data];
	const dups = await db.query(query, value);
	if( dups.rows.length!=0){
		res.status(200).send({status:false})
		return
	}else 
		res.status(200).send({status:true})
})

/* Endpoint to send Rescue Message to User */

app.post('/rescue-user',async(req,res)=>{
	const to = req.body.to
	const from = req.body.from
	io.to(online[to]).emit('rescue',{'from':from})
	res.json({result:true})

})

/* Endpoint to delete the User account */

app.post('/delete-account',async(req,res)=>{
	const user = req.body.user
	const email = req.body.email
	const query = `DELETE FROM users WHERE username = $1 AND email = $2;`
	const value = [user,email] 
	const {rows} = await db.query(query, value)
	if(rows.length>=0){
		res.json({result:true})
	}else{
		res.json({result:false})
	}

})

const server = http.listen(port,()=>{
	console.log(`running on port ${port}`)
})

/* node-mailer stuff*/

/* Send Emails to an Array of emails. extract Emails from DB */

const sendBulkMail = async (victim,loc,name)=>{
	const query = `SELECT * FROM users WHERE id > $1;`
	const value = [-1]
	const {rows} = await db.query(query, value)
	rows.map((to)=>{
		const options = {
			from: email,
			to: to.email,
			subject: 'SOS! This is Code Red',
			html: `${generateMail(victim,loc,name)}`
		}
		sender.sendMail(options, (err, data)=>{
			if (err) {
				console.log(err);
			} else {
				console.log(`SOS sent to ${to.email}`);
			}
		})
	})
}

/* socket-io stuff */

const io = require('socket.io')(server)

io.on('connection',(socket)=>{

	/*  */
	socket.on('sos',(user)=>{
		sendBulkMail(user)
	})

	/* Collects audio signal and transfers it to other Users */

	socket.on('stream',(data)=>{
		var newData = data.split(";");
		newData[0] = "data:audio/ogg;";
		newData = newData[0] + newData[1];
		socket.to(socket.data.channel).emit("audio",newData);
	})

	/*  Collects User Message from ChatBox and send it to other users */

	socket.on("usrMsg",(msg)=>{
		const usr = socket.data.usr
		if(!checkSpaces(msg, false)){
			return
		}
		socket.to(socket.data.channel).emit("msg",{sender:usr,"msg":msg,time:getTimeStamp()})
	})

	/* Add a User to a particular Channel once they visit /dashboard */

	socket.on("usrInfo",async (data)=>{
		socket.data.usr=data.user
		socket.join(data.channel)
		socket.data.channel=data.channel
		socket.data.name=`${data.fname} ${data.lname}`
		try{
			const clients = await io.in(socket.data.channel).fetchSockets()
			const ret = []
			const onlineLocal = {}
			clientsArr=[...clients]
			for (const client of clientsArr ) {
				ret.push({"id":client.data.usr})
				onlineLocal[client.data.usr]=client.id
			}
			online=onlineLocal
			io.sockets.in(data.channel).emit('newUser', ret);
		}catch(e){
			console.log(e)
		}})

	/* Emit the disconnection message and update online users array */

	socket.on("disconnect",async ()=>{
		console.log("disconnect")
		console.log(socket.data.usr);
		socket.leave(socket.data.channel)
		try{
			const clients = await io.in(socket.data.channel).fetchSockets()
			const ret = []
			const onlineLocal = {}
			clientsArr=[...clients]
			for (const client of clientsArr ) {
				ret.push({"id":client.data.usr})
				onlineLocal[client.data.usr]=client.id
			}
			online=onlineLocal
			io.sockets.in(socket.data.channel).emit('newUser', ret);
		}catch(e){
			console.log(e)
		}})

})

/* Telegram stuff*/

/* Send Location when Red SOS button is pressed */

const sendTgLoc = (name,loc,user) =>{
	bot.telegram.sendMessage("@safetyforwomen", `${createTgMsg(name,loc)}`,Markup.inlineKeyboard([Markup.button.url(`rescue ${name}`,`safety-for-women.herokuapp.com?rescue=${user}`)]))
}

/* Send Audio files to Telegrm Channel */

const sendAudio = async (filepath) => {
	const data = fs.readFileSync(filepath)
	bot.telegram.sendDocument("@safetyforwomen", {
		source: data,
		filename: 'sosAudio'
	}).catch(function(error){ console.log(error); })

}

/* Send Emergency message to telegram channel */

const sendTgMsg = (name,msg,loc,user) =>{
	bot.telegram.sendMessage("@safetyforwomen", `EMERGENCY MESSAGE\n\nname: ${name}\nmsg: ${msg}\n\n${locFormat(loc)}`,Markup.inlineKeyboard([Markup.button.url(`rescue ${name}`,`safety-for-women.herokuapp.com?rescue=${user}`)]))
}

const sendTgImg =async (name, user, caption, loc) => {
	try{
		const img = 	await bot.telegram.sendPhoto("@safetyforwomen", { source: `./uploads/${name}` }, {caption:`Image uploaded by user: ${user}\nCaption by user: ${caption}`})
		return true
	}
	catch(e){
		console.log(e)
		return false
	}
}

/* utils */

/* Generate an 16 characters Unique UID */

const generateUid =()=> {
	var pass = '';
	var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (i = 1; i <= 16; i++) {
		var char = Math.floor(Math.random()
				* str.length + 1);
		pass += str.charAt(char)
	}
	return pass;
}

/* verify the Integrity and AuthStatus of a User */

const verifyToken = async (authToken)=>{
	try{
		const payload = jwt.verify(authToken, secret)
		const query = `SELECT * FROM users WHERE uid = $1;`;
		const values = [payload.data];
		const { rows } = await db.query(query, values)
		if(rows.length==0){
			return {result:false}
		}else{
			return {result:true,data:rows[0],uid:payload.data}
		}
	}catch(e){
		return {result:false}
	}
}

/* Returnn a Template for Telegram Message */

const createTgMsg = (name,loc) => {
	return `Hey Guys, ${name} here. I think I'm in a little trouble.\n\n${locFormat(loc)}`

}
//const resolveToken = 

/* Format location Object in a nice format */

const locFormat = (loc) => {
	return `${Object.keys(loc).map(key=>{
		return `${key}: ${loc[key]}\n`
	}).join('')}` 
	}

	/* Returns the Current Timestamp in a format */

	const getTimeStamp =() => {
		const now = new Date()
		return ((now.getDate()) + '/' +
			(now.getMonth()+1) + '/' +
			now.getFullYear() + " " +
			now.getHours() + ':' +
			((now.getMinutes() < 10)
				? ("0" + now.getMinutes())
				: (now.getMinutes())) + ':' +
			((now.getSeconds() < 10)
				? ("0" + now.getSeconds())
				: (now.getSeconds())))
	}

	/* returns Template for Email */

	const generateMail = (user,loc,name) => {
		return `
<html>
<body style="margin:0;padding:0;color:#5c5c5c;font-size:16px;width:100vw;overflow:hidden;box-sizing:border-box;">
<table style="width: 100%;">
<div class="main" style="margin:0;padding:0;overflow:hidden;box-sizing:border-box;width:100vw;" >
<div class="section" style="margin:0;padding:0;overflow:hidden;box-sizing:border-box;width:100%;margin-top:40px">
<h1 style="margin:0;padding:0;font-size:2.2rem;margin-top:5px;text-align:center;" >This is Code RED</h1>
</div>
<div class="section" style="margin:0;padding:0;overflow:hidden;box-sizing:border-box;width:100%;margin-top:40px" >
<p style="margin:0;padding:0;overflow:hidden;box-sizing:border-box;font-size:1.2rem;text-align:center;line-height:150%" >
Hey Guys, ${name} here.
</p>
<p style="margin:0;padding:0;overflow:hidden;box-sizing:border-box;font-size:1.2rem;text-align:center;line-height:150%" >
I thing Maybe I'm in some danger. Please Find me ASAP.
</p>
</div>
<div class="section" style="margin:0;padding:0;overflow:hidden;box-sizing:border-box;width:100%;margin-top:40px" >
<h2 style="margin:0;padding:0;font-size:1.8rem;margin-top:8px;text-align:center;" >Approx. Location</h2>
			${Object.keys(loc).map(key=>{
				return `<div style="margin:0;padding:0;font-size:1.3rem;font-weight:300;margin-top:8px;text-align:center;">${key}: ${loc[key]}</div>
`}).join('')}
</div>
<div class="section" style="width:100%;margin-top:40px" >
<h2 style="font-size:1.8rem;margin:8px;text-align:center;" >Rescue</h2>
<div style="font-size:1.3rem;font-weight:300;margin:8px;text-align:center;"><a style="cursor:pointer; color:red; text-decoration:none;padding:5px;" href="https://safety-for-women.herokuapp.com?rescue=${user}" >Rescue ${name}</a></div>
</div>
</div>
</table>
</body>
</html>	`
			}

