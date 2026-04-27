import supportsColor from "supports-color";

// totally not stolen from https://github.com/chalk/chalk/blob/main/source/vendor/ansi-styles/index.js
const COLOURS = {
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],

  // Bright color
  blackBright: [90, 39],
  gray: [90, 39], // Alias of `blackBright`
  grey: [90, 39], // Alias of `blackBright`
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],
  whiteBright: [97, 39],
}

function baselog(colour, prefix, ...args) {
  if(process.env.ENV != "development") {return}
  
  if(supportsColor.stdout){
    return console.log(`\u001B[${colour[0]}m${prefix}\u001B[${colour[1]}m`, ...args)
  }else{
    return console.log(PREFIX, ...args);
  }

}

function logRenderer(...args){
  return baselog(COLOURS.cyan, "[R]", ...args)
}

function logServer(...args){
  return baselog(COLOURS.blueBright, "[S]", ...args)
}

function logAssets(...args){
  return baselog(COLOURS.green, "[A]", ...args)
}

function logUI(...args){
  return baselog(COLOURS.yellow, "[U]", ...args)
}

export {
  logRenderer,
  logServer,
  logAssets,
  logUI
}