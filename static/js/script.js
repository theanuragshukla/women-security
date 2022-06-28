let socket
var localStream
var data
const msgs = []
const usrStatus = {
	user:'',
	channel:'global',
	fname:"",
	lname:"",
	email:"",
	online:'',
	mic:false,
	speaker:true,
}

let prevLoc={
	gps:"OFF"
}
const constraints = {
	audio: {
		channelCount: 1,
		sampleRate: 16000,
		sampleSize: 16,
		volume: 1
	}
}


const time=1000

/* Utility Functions */

/* return blocks by ID */

const getBlock=(id)=>{
	return document.getElementById(id);
}

/* returns Timestamp in a specified format */

const getTimeStamp=()=> {
	var now = new Date();
	return ((now.getDate()) + '/' +
		(now.getMonth()+1) + '/' +
		now.getFullYear() + " " +
		now.getHours() + ':' +
		((now.getMinutes() < 10)
			? ("0" + now.getMinutes())
			: (now.getMinutes())) + ':' +
		((now.getSeconds() < 10)
			? ("0" + now.getSeconds())
			: (now.getSeconds())));
}

/* return a random class with colors */

const randomColor=()=>{
	const colors=["skyblue","orange","violet","magenta","tred","tblue","tgreen"]
	return colors[Math.floor(Math.random()*colors.length)]
}

/* default messages in chatbox */

const defaultMsgs=[{sender:"dev","msg":"send a message to everyone currently online",time:getTimeStamp()},{sender:"dev","msg":"just type a message and hit enter.",time:getTimeStamp()}]

/* handles the click on big Red SOS button */

const sendSOS =async () => {
	if (window.navigator.geolocation) {
		window.navigator.geolocation.getCurrentPosition(
			successCallBack,
			successCallBack
		)
	}
}

const successCallBack=async (data)=>{
	let loc
	try{
		loc={
			gps:"ON",
			latitude:data.coords.latitude,
			longitude:data.coords.longitude,
			altitude:data.coords.altitude,
			timestamp:data.coords.timestamp,
			heading:data.coords.heading,
			speed:data.coords.speed,
			accuracy:data.coords.accuracy,
			altitudeAccuracy:data.coords.altitudeAccuracy
		}}catch(e){
			loc={
				gps:"OFF"
			}
		}
	prevLoc=loc

	const name = usrStatus.fname+" "+usrStatus.lname
	const user = usrStatus.user
	getBlock("bigRed").disabled=true
	fetch('/emergency',{
		method:"post",
		headers: {
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json'
		},
		crossdomain: true,
		withCredentials:'include',
		body:JSON.stringify({loc:loc,"name":name,"user":user})
	})
		.then(res => res.json())
		.then((res)=>{
			if(res.status){
				alert("SOS Sent!!")
				getBlock("bigRed").disabled=false
			}
			else{
				alert("can't send SOS right now")
				getBlock("bigRed").disabled=false
			}
		})

}

/* handles the emergency message send via the input below SOS button */

const sendSosMsg = (e) => {
	const msg = e.target.value
	const name = usrStatus.fname+" "+usrStatus.lname
	const user = usrStatus.user
	e.target.value=''
	fetch('/sosMsg',{
		method:"post",
		headers: {
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json'
		},
		crossdomain: true,
		withCredentials:'include',
		body:JSON.stringify({loc:prevLoc,"msg":msg,"name":name,"user":user})
	})
}

/* adds send functionality on enter */

getBlock("sosMsgInp").addEventListener("keydown",(e) => {
	if (e.keyCode == 13) { 
		e.preventDefault()
		sendSosMsg(e)	
	}
}, false)

/* adds send functionality on enter */

getBlock("chatBoxInp").addEventListener("keydown",(e) => {
	if (e.keyCode == 13) { 
		e.preventDefault()
		sendMsg(e)	
	}
}, false)

/* Function to handle the logout process */

const logout=async ()=>{
	await fetch('/log-me-out', {
		method: 'GET',
		crossdomain: true,
		withCredentials:'include'
	})
		.then(res => res.json())
		.then(res=>{
			if(res.status){
				location.href="/"
			}
			else
				alert('something went wrong')
		})

}

/* append new messages into the chatbox */

const appendMessage=(data)=>{
	getBlock("msgs").innerHTML+=`
		<div class="msg">
		<div class='sender'>@${data.sender}</div>
		<div class="msgTxt">${data.msg}</div>
		<div class="time">${data.time}</div>
		</div>
	`	
	scrollToBottom()
	sessionStorage.setItem("msgs", JSON.stringify(msgs))
}

/* send chatbox messages to the server */

const sendMsg=(e)=>{
	const msgVal = e.target.value
	e.target.value=''
	if(!checkSpaces(msgVal, false)){
		return
	}
	const timeStamp=getTimeStamp()
	const data = {sender:`${usrStatus.user}`,msg:msgVal,time:timeStamp}
	msgs.push(data)
	appendMessage(data)
	socket.emit("usrMsg",msgVal)
}

/* Simple function to scroll To Bottom */

const scrollToBottom=()=>{
	getBlock("msgs").scrollTo({ left: 0, top: getBlock("msgs").scrollHeight, behavior: "smooth" });
}

/* Toggle the status of Microphone and start audio recorder if status is true and then transfers voice messages to the server for furthur handling */

const muteOutgoing=(e)=>{
	usrStatus.mic=!usrStatus.mic
	e.setAttribute("src",!usrStatus.mic ? "/static/img/micMute.svg" : "/static/img/mic.svg")
	socket.emit("usrInfo",usrStatus)
	if(!usrStatus.mic){
		stop();
		return
	}
	navigator.mediaDevices.getUserMedia({ audio:constraints }).then((stream) => {
		var mediaRecorder = new MediaRecorder(stream)
		localStream=stream
		mediaRecorder.start()
		var audioChunks = []
		mediaRecorder.addEventListener("dataavailable", function (event) {
			audioChunks.push(event.data)
		})
		mediaRecorder.addEventListener("stop", function () {
			var audioBlob = new Blob(audioChunks)
			audioChunks = []
			var fileReader = new FileReader()
			fileReader.readAsDataURL(audioBlob)
			fileReader.onloadend = function () {
				var base64String = fileReader.result
				socket.emit("stream", base64String)
			}
			mediaRecorder.start()
			setTimeout(function () {
				mediaRecorder.stop()
			}, time)
		})
		setTimeout(function () {
			mediaRecorder.stop()
		}, time)
	})
}

/* Function to toggle speakers on/off */

const muteIncoming=(e)=>{
	usrStatus.speaker=!usrStatus.speaker
	e.setAttribute("src",usrStatus.speaker? "/static/img/sound.svg" : "/static/img/noSound.svg")
}

/* Stop audio recording immedietely on mute */

const stop=()=>{
	localStream.getTracks().forEach( (track) => {
		track.stop()
	})

}

window.onload=async ()=>{
	socket=await io.connect('/')
	const params = (new URL(document.location)).searchParams
	const toRescue = params.get("rescue")
	const verify =async ()=>{
		await fetch('/checkAuth', {
			method: 'GET',
			crossdomain: true,
			withCredentials:'include'
		})
			.then(res => res.json())
			.then(res =>manageAuth(res))
	}
	const manageAuth=(val)=>{
		data=val
		if(!val.result){
			location.href='/'
		}else{
			usrStatus.fname=data.data.fname
			usrStatus.lname=data.data.lname
			usrStatus.user=data.data.username
			usrStatus.email=data.data.email
		}
	}
	await verify()
	if(toRescue!=null || toRescue!=undefined ){
		await fetch('/rescue-user',{
			method:"post",
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			crossdomain: true,
			withCredentials:'include',
			body:JSON.stringify({"to":toRescue,"from":usrStatus.user})
		})
			.then(alert(`rescue message sent to @${toRescue}.\n\nTry to connect with them via text/voice chat.`))

	}

	await socket.emit("usrInfo",usrStatus)
	getBlock("chatBoxInp").setAttribute('placeholder',`message as @${usrStatus.user}`)
	const oldMsgs = JSON.parse(sessionStorage.getItem("msgs"))
	if(oldMsgs!=null || oldMsgs!=undefined ){
		oldMsgs.map(obj=>{
			if(obj!=null || obj!=undefined){
				msgs.push(obj)
			}
		})
	}else{
		defaultMsgs.map(obj=>{
			if(obj!=null || obj!=undefined){
				msgs.push(obj)
			}
		})
	}
	msgs.map(appendMessage)
	socket.on("msg",(data)=>{
		msgs.push(data)
		appendMessage(data)
	})
	socket.on("audio", function (data) {
		if(!usrStatus.speaker) return
		var audio = new Audio(data);
		audio.play();
	})
	socket.on("newUser",(data)=>{
		const users = getBlock("allUsrs")
		users.innerHTML=""
		for(const user of data){
			users.innerHTML+=`<span id="user" class="user ${randomColor()}">@${user.id} ${user.id==usrStatus.user ? "(you)":""}</span>`
		}
	})

	socket.on('rescue',(data)=>{
		getBlock('rescueMsg').innerHTML=`<span>###</span> @${data.from} is coming for rescue <span>###</span>
		`
		getBlock('rescueMsg').classList.remove('newNot')
		getBlock('rescueMsg').classList.add('newNot')
	})

}

/* DANGER ZONE */

const deleteAccount =async () => {
	await fetch('/delete-account',{
		method:"post",
		headers: {
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json'
		},
		crossdomain: true,
		withCredentials:'include',
		body:JSON.stringify(usrStatus)
	})
		.then(res => res.json())
		.then(res=>{
			if(res.result){
				alert('account deleted successfully!')
				location.href='/'
			}else{
				alert("something's wrong, I can feel it!")
			}
		})
}

const wantToDelete = () => {
	const sure = confirm("Account deletion is an irreversible process and you'll be unable to use the services.\n\nproceed to account deletion ?")
	if(sure==true){
		deleteAccount()
	}else{
		return
	}
}
