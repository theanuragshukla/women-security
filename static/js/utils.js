
/* Checks the spaces in a given input */

const checkSpaces=(str, exact)=> {
	var len = str.replace(/\s/g, '').length
	return (exact ? len === str.length && len !== 0: len !== 0)
}

/* Checks the length of a given input */
const checklen=(min,max,str)=>{
	if(!checkSpaces(str, true)){
		return false;
	}else{
		if(!(str.length<=max || str.length>=min)){
			return false;
		}else{

			return true;
		}

	}
}

/* Checks if a Name entered follows a Criteria */

const chkName=(str)=>{
	return checklen(3, 50, str)
}

/* Checks if an Email is valid or not */
const validEmail=(str)=>{
	const atposition = str.indexOf("@");
	const dotposition = str.lastIndexOf(".");
	const wrongEmail = (atposition < 1 || dotposition < atposition+2 || dotposition+2 >= str.length || str.length <= 5);
	return !wrongEmail
}

/*  Confirms a valid email */

const chkEmail=(str)=>{
	return (checklen(8, 100, str) && validEmail(str) ? true : false )
}

/* Checks íf a Username is valid or not */
const validUser=(str)=>{
	const valid = /^[a-z0-9_\.]+$/.test(str);
	return (valid && checklen(6, 16, str) ? true : false);	
}

/*  Check that a password is valid or not */

const chkPass= (str)=>{
/*
	var regularExpression = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;

	if(regularExpression.test(str)){
		return (checklen(8, 128, str)?true : false);
	}else{
		return false
	}
	*/
	return checklen(8,128, str)
}

/* Check all the properties mentioned above from an Object and return boolean */

const checkAll=async (arr)=>{
	const passError = !chkPass(arr.pass)
	const nameError = !chkName(arr.fname)
	const emailError = !chkEmail(arr.email)
	const userError = !validUser(arr.user)
	if(passError || nameError || emailError || userError){
		return false
	}else{
		return true
	}
} 
