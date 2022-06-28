const error = document.getElementById('error')
let querystring,rescue

/* Main Login Function */

const login=(e)=>{
	e.innerText="wait..."
	const user = document.getElementById('user')
	const pass = document.getElementById('pass')

	const data = {
		pass:pass.value,
		user:user.value
	}

	fetch('/let-me-in', {
		method: 'POST',
		headers: {
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify( {
			pass:pass.value,
			"user":user.value
		})
	})
		.then(res=>res.json())
		.then(res=>loginStatus(res.status,e))

}

/* Function runs on Window Load */

window.onload=()=>{
	querystring = window.location.search.substring(1)
	rescue = querystring!=null && querystring!=undefined && querystring.indexOf("rescue")!=-1
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

			location.href=`/dashboard${rescue ? "?"+querystring : '' }`
		}
	}
	verify()

}

/* Check the status of the previous Login Process */

const loginStatus =(status,btn)=>{
	error.style.display=!status ? "initial" :"none"
	if(status){
		btn.innerText="redirecting..."
		location.href=`/dashboard${rescue ? "?"+querystring : '' }`

	}
	else{
		btn.innerText="try again"
	}
}
