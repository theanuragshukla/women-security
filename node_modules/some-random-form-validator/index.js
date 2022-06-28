const checkSpaces=(str, exact=true)=> {
        var len = str.replace(/\s/g, '').length
        return (exact ? len === str.length && len !== 0: len !== 0)
}

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

const checkName=(str)=>{
        return checklen(3, 50, str)
}

const validEmail=(str)=>{
        const atposition = str.indexOf("@");
        const dotposition = str.lastIndexOf(".");
        const wrongEmail = (atposition < 1 || dotposition < atposition+2 || dotposition+2 >= str.length || str.length <= 5);
        return !wrongEmail
}

const checkEmail=(str)=>{
        return (checklen(8, 100, str) && validEmail(str) ? true : false )
}

const checkUser=(str)=>{
        const valid = /^[a-z0-9_\.]+$/.test(str);
        return (valid && checklen(8, 20, str) ? true : false);
}
const checkPass=(str)=>{
        var regularExpression = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
        if(regularExpression.test(str)){
                return (checklen(8, 128, str)?true : false);
        }else{
                return false
        }
}

const checkAll=(arr)=>{
        const passError = !checkPass(arr.pass)
        const nameError = !checkName(arr.fname)
        const emailError = !checkEmail(arr.email)
        const userError = !checkUser(arr.user)
        if(passError || nameError || emailError || userError){
                return false
        }else{
                return true
        }
}

module.exports={
	checkUser,
	checkEmail,
	checkName,
	checkPass,
	checkAll,
	checklen,
	checkSpaces
}
