
const signupBtn = document.getElementById("signup")
const btn1 = document.getElementById("btnLeft")
const btn2 = document.getElementById("btnRight")
const fname  = document.getElementById('fname')
const lname  = document.getElementById('lname')
const email = document.getElementById('email')
const user = document.getElementById('user')
const pass = document.getElementById('pass')
const key = document.getElementById('key')
const error = document.getElementById('error')

/* Main Signup function */

const signup=async()=>{
	const res = validUser(user.value) 
	error.innerHTML=res ? "" : "enter a valid username"
	validateStatus(res)
	if(!res)return
	var dupUser =await fetch('/checkDup', {
		method: 'POST',
		headers: {
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json'
		},

		crossdomain: true,
		withCredentials:'include',
		body:JSON.stringify({email:false,data:user.value})
	})
		.then(response => response.json())
	dupUser=!dupUser.status

	if(dupUser){
		error.innerHTML="username already in use"
		validateStatus(false)
		return 
	}

	const data = {
		fname:fname.value,
		lname:lname.value,
		email:email.value,
		pass:pass.value,
		user:user.value,
		code:key.value
	}
	if(await checkAll(data)){
		fetch('/add-new-user', {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {
				fname:fname.value,
				lname:lname.value,
				email:email.value,
				pass:pass.value,
				"user":user.value,
				code:key.value
			})
		})
			.then(res=>res.json())
			.then(res=>{
				if(res.status){
					alert('account created successfully! please login')
					location.href='/'
				}else{
					error.innerHTML=res.result
				}

				validateStatus(res.status)
			}
			)
	}
	else {
		alert("error")
	}


}
const arr = [1,2,3]
var pos = 1
const inpDiv1 = document.getElementById("inpDiv1");
const inpDiv2 = document.getElementById("inpDiv2");
const inpDiv3 = document.getElementById("inpDiv3");
inpDiv3.style.display="none"
inpDiv2.style.display="none"

/* Function used to validate entries onspot when user press next  */

const validateOnSpot =async (state) => {
	if(state==1){
		const res = chkName(fname.value)
		error.innerHTML=res ? "" : "enter a valid name"
		validateStatus(res)
		return res
	}
	else if(state==2){
		const resEmail = chkEmail(email.value)
		const resPass = chkPass(pass.value)
		if(!resEmail){
			error.innerHTML="enter a valid email"
			validateStatus(resEmail)
			return resEmail
		}
		var dupEmail=await fetch('/checkDup', {
			method: 'POST',
			crossdomain: true,
			withCredentials:'include',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body:JSON.stringify({email:true,data:email.value})
		}).then(response => response.json())
		dupEmail=!dupEmail.status
		if(dupEmail){
			error.innerHTML="email already in use"
			validateStatus(false)
			return false
		}

		error.innerHTML=resPass ? "" : "enter a valid password"
		validateStatus(resPass)
		return resPass


	}
}

/* Function to Slide between multiple input slides */

const slideInp=async (dir)=>{
	if(dir==-1){
		pos=(pos==1)?pos:pos-1
	}else if(dir==1){
		if(! await validateOnSpot(pos)){
			return
		}
		pos=(pos==3)?pos:pos+1
	}
	signupBtn.style.display=pos==3 ? "initial" : "none";
	btn1.style.display=pos==1 ? "none" : "initial";
	btn2.style.display=pos==3 ? "none" : "initial";
	arr.forEach((idx)=>{
		if(idx==pos){
			window[`inpDiv${idx}`].style.display="flex"
		}else{
			window[`inpDiv${idx}`].style.display="none"
		}
	})
}

/* Onload function */

window.onload=()=>{
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
		if(val.result){
			location.href='/dashboard'
		}
	}
	verify()

}

/* Checks the status of previous signup attempt */

const validateStatus =(status)=>{
	error.style.display=!status ? "initial" :"none"
}
