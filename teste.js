var ReverseMd5 = require('reverse-md5')
const rev = ReverseMd5({
    lettersUpper: false,
    lettersLower: true,
    numbers: false,
    special: false,
    whitespace: false,
    maxLen: 1
})
console.log(rev('0cc175b9c0f1b6a831c399e269772661'))