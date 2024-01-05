// Custom imports from local files
const Settings = require('./settings.json');    // used to get bot token from the app's API

// Node.js module imports
const Discord = require('discord.js');

// global variables
const defaultPrefix = '>>';
const commandList = ['help', 'setprefix', 'makebet', 'showbets', 'forcedeclare', 'clearall'];
const reactionID = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const unicode = ['\u0030\u20E3','\u0031\u20E3','\u0032\u20E3','\u0033\u20E3','\u0034\u20E3','\u0035\u20E3', 
                '\u0036\u20E3','\u0037\u20E3','\u0038\u20E3','\u0039\u20E3', '🔟'];
const illegalPrefix = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                       'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '1', '2', '3',
                       '4', '5', '6', '7', '8', '9'];
const storedBets = new Map();
const embedColor = '#11b7d1';
const embedAuthor = 'Betting Bot';
const maxIDSize = 19;

// general constants and initializers
const client = new Discord.Client();
let prefix = defaultPrefix;
const timeout = 120_000;
// const timeout = 30_000;

// helper functions
function checkValidCommand(command) {
    for(const item of commandList) {
        if(command.includes(item)) return item;
    }
    return false;
}

function printHelp() {
    const embed = new Discord.MessageEmbed();
    embed.setColor(embedColor);
    embed.setAuthor(embedAuthor);
    embed.setTitle('Welcome to the Betting Bot!');
    embed.setDescription('Hello there! I am a betting bot. You can use me in your server' 
                        + ' to conduct friendly bets amongst your server members. Members' 
                        + ' can choose to bet on a **live** bet by clicking on a reaction'
                        + ' that corresponds to the item on the betting list. These bets'
                        + ' are timed, and therefore will **expire** after a certain time.'
                        + '\n\nYou have access to `' + commandList.length + '` commands for' 
                        + ' this bot. You can let me know which command to execute by using' 
                        + ' the following syntax:\n`<prefix><command name>(<any parameters>)`'
                        + ' My default prefix is **`>>`**, but you have the option to change' 
                        + ' it.\n\n**Commands:**\n\n'
                        + '- **`help`** : prints out this message as an embed\n\n'
                        + '- **`setPrefix(prefixName)`** : sets the prefix to `prefixName`' 
                        + ' and returns a success message if the change was successful and a' 
                        + ' failure message otherwise\n\n'
                        + '- **`makeBet(item1, item2, ..., itemN)`** : creates a live bet for' 
                        + ' your server members to participate in. This command returns a' 
                        + ' **`bettingID`** (used by another command) as a DM to the creator,' 
                        + ' and a embed with the bet details and **N** distinct reactions for' 
                        + ' members to bet on. Once a bet has been cast, the bot **will not**' 
                        + ' consider any changes from the intial bet of the user. The live bet'
                        + ' expires after ' + (timeout/1000) + ' seconds. The bet will be closed,' 
                        + ' and no new bets on the items will be considered by the bot. This' 
                        + ' **will not** remove the bet from the list. Please refer to the ' 
                        + '`forceDeclare()` command for that.\n\n'
                        + '- **`showBets`** : Prints out all the bets in the list. This list will' 
                        + ' show all bets, both active and closed, with their stored result and their' 
                        + ' status (**ACTIVE** or **CLOSED**). The list is printed as an embed message.\n\n' 
                        + '- **`forceDeclare(bettingID, result?)`** : Used to remove any bet' 
                        + ' that corresponds to that ID from the list. The `result` is optional.' 
                        + ' This command will see if the id is valid and if the result is one of the' 
                        + ' betting items for that bet. Then it will remove the bet from the list and'
                        + ' declare who actually won vs. who the bet projected.\n\n'
                        + '- **`clearAll`** : clears out all bets from the list at once. Returns a message'
                        + ' if successful.');
    return embed;
}

function resetPrefix(newPrefix) {
    if(illegalPrefix[0] === newPrefix) return false;
    for(let i = 1; i < illegalPrefix.length; i++) {
        if(newPrefix.startsWith(illegalPrefix[i])) return false;
    }
    prefix = newPrefix;
    return true;
}

function makeBet(itemList, caller) {
    const size = itemList.length;
    for(let i = 0; i < size; i++) itemList.push(itemList.shift().trim());
    const bettingID = generateID(itemList, caller.username);
    if(!storedBets.has(bettingID)) {
        const betData = { items : itemList, zerolist : [], onelist : [], twolist: [],
            threelist : [], fourlist : [], fivelist : [], sixlist : [], sevenlist : [],
            eightlist : [], ninelist : [], tenlist : [], predictedWinner: '', betSize: -1
        };
        storedBets.set(bettingID, betData);
    } else {
        caller.send('Failed to add bet to the list. Please try making the bet again.');
        return false;
    }
    const callerEmbed = new Discord.MessageEmbed();
    callerEmbed.setColor(embedColor);
    callerEmbed.setAuthor(embedAuthor);
    callerEmbed.setTitle('Requested Betting ID');
    let desc = 'You have made a bet order that has been successfully been appended to the' 
    + ' betting list. You can view the betting list by calling `' + prefix + 'showBets`'
    + ' on your server.\n\nYour bet contain the following items';
    for(const word of itemList) {
        desc += '\n- ' + word;
    }
    desc += '\n\nYour **Betting ID** is **`' + bettingID + '`**';
    callerEmbed.setDescription(desc);
    caller.send(callerEmbed);
    return bettingID;
}

function generateID(items, caller) {
    let fullString = '';
    for(const word of items) fullString += word;
    fullString += caller.toLowerCase();
    fullString = fullString.split('');
    for(let i = fullString.length - 1; i >= 0; i--) {
        if(fullString[i] === ' ') {
            fullString.splice(i, 1);
        }
    }
    if(fullString.length < maxIDSize) {
        const oldSize = fullString.length;
        for(let i = 0; i < maxIDSize - oldSize; i++) {
            fullString.push('' + Math.floor(Math.random() * 10));
        }
    }
    // Fisher-Yates Algorithm
    for(let i = fullString.length - 1; i >= 0; i--) {
        let randIndex = Math.floor(Math.random() * (i + 1));
        let temp = fullString[i];
        fullString[i] = fullString[randIndex];
        fullString[randIndex] = temp;
    }
    fullString = fullString.slice(0, maxIDSize);
    fullString = fullString.join('');
    return '@' + fullString;
}

function checkAlreadyBet(id, user) {
    const betData = storedBets.get(id);
    if(betData.zerolist.length !== 0 && betData.zerolist.includes(user)) return true;
    if(betData.onelist.length !== 0 && betData.onelist.includes(user)) return true;
    if(betData.twolist.length !== 0 && betData.twolist.includes(user)) return true;
    if(betData.threelist.length !== 0 && betData.threelist.includes(user)) return true;
    if(betData.fourlist.length !== 0 && betData.fourlist.includes(user)) return true;
    if(betData.fivelist.length !== 0 && betData.fivelist.includes(user)) return true;
    if(betData.sixlist.length !== 0 && betData.sixist.includes(user)) return true;
    if(betData.sevenlist.length !== 0 && betData.sevenlist.includes(user)) return true;
    if(betData.eightlist.length !== 0 && betData.eightlist.includes(user)) return true;
    if(betData.ninelist.length !== 0 && betData.ninelist.includes(user)) return true;
    if(betData.tenlist.length !== 0 && betData.tenlist.includes(user)) return true;
    return false;
}

function showBets() {
    const embed = new Discord.MessageEmbed();
    embed.setColor(embedColor);
    embed.setAuthor(embedAuthor);
    embed.setTitle('All Bets in Betting List (**Active** & **Closed**)');
    let idVal = '';
    let winnerVal = '';
    let statusVal = '';
    for(const elem of storedBets.keys()) {
        idVal += elem + '\n';
        let temp = storedBets.get(elem).predictedWinner;
        winnerVal += temp === '' ? 'Not Calculated\n' : temp + '\n';
        temp = storedBets.get(elem).betSize;
        statusVal += temp === -1 ? '**ACTIVE**\n' : '**CLOSED**\n'; 
    }
    if(idVal === '' || winnerVal === '' || statusVal === '') {
        idVal = 'Empty List';
        winnerVal = 'Empty List';
        statusVal = 'Empty List';
        embed.setDescription('There are no bets in the list currently.');
    }
    embed.addFields(
        { name: 'Bet ID', value: idVal, inline: true},
        { name: 'Predicted Winner', value: winnerVal, inline: true},
        { name: 'Status', value: statusVal, inline: true},
    );
    return embed;
}

function forceDeclare(parameters) {
    const id = parameters[0];
    let winner = 'Not Set';
    if(parameters.length == 2) winner = parameters[1];
    if(!storedBets.has(id)) return false;
    const betData = storedBets.get(id);
    if(winner !== 'Not Set' && !betData.items.includes(winner)) return false;
    const embed = new Discord.MessageEmbed();
    embed.setColor(embedColor);
    embed.setAuthor(embedAuthor);
    embed.setTitle('Final Results');
    let desc = 'The bet has now been finished and the winners have been declared.';
    if(betData.predictedWinner == '') {
        desc += ' The bet was forced to declare early, so no predictions could be made'
                + ' from the bets placed.';
    } else {
        desc += '\nThe **predicted winner** was: `' + betData.predictedWinner + '`.'
                + ' The following people betted on ' + betData.predictedWinner + '\n';
        desc += compileBetters(betData.predictedWinner, betData) + '\n';
        
    }
    if(winner !== 'Not Set') {
        desc += 'The **actual winner** was: `' + winner + '`. The following people'
                + ' betted on ' + winner + '\n';
        desc += compileBetters(winner, betData);
    }
    embed.setDescription(desc);
    storedBets.delete(id);
    return embed;
}

function compileBetters(winner, data) {
    const boolTable = [false, false, false, false, false, false, false, false, false, false, false,];
    let retval = '';
    for(let i = 0; i < data.items.length; i++) {
        if(data.items[i] === winner) {
            boolTable[i] = true;
        }
    }
    if(boolTable[0]) retval += data.zerolist.join('\n'); 
    if(boolTable[1]) retval += data.onelist.join('\n'); 
    if(boolTable[2]) retval += data.twolist.join('\n'); 
    if(boolTable[3]) retval += data.threelist.join('\n'); 
    if(boolTable[4]) retval += data.fourlist.join('\n'); 
    if(boolTable[5]) retval += data.fivelist.join('\n'); 
    if(boolTable[6]) retval += data.sixlist.join('\n'); 
    if(boolTable[7]) retval += data.sevenlist.join('\n'); 
    if(boolTable[8]) retval += data.eightlist.join('\n'); 
    if(boolTable[9]) retval += data.ninelist.join('\n'); 
    if(boolTable[10]) retval += data.tenlist.join('\n'); 
    return retval;
}

function clearList() {
    storedBets.clear();
    return 'Successfully cleared all staged bettings from the list';
}

client.once('ready', () => {
    console.log('Bot Active!');
});

client.on('message', async message => {
    if(message.author.bot) return;          // ignore messages from another bot
    if(!message.guild) return;
    if(message.content.startsWith(prefix)) {
        let command = message.content.slice(prefix.length).toLowerCase();
        const validity = checkValidCommand(command);
        if(validity == false) return message.reply('The command: `' + command + '` is invalid.\n' 
                + 'Please refer to `' + defaultPrefix + 'help` for all valid commands and their ' 
                + 'respective documentations');
        switch(validity) {
            case 'help':
                const embed = printHelp();
                return message.channel.send(embed);
            case 'setprefix':
                command = command.slice(9);
                if(!command.startsWith('(') || !command.endsWith(')')) {
                    return message.channel.send('The syntax is incorrect.');
                }
                const parameter = command.substring(1, command.length - 1).trim();
                let output = resetPrefix(parameter) ? 'Successfully changed prefix to ' + prefix 
                        : 'Failed to change prefix. Prefix remains ' + prefix;
                return message.channel.send(output);
            case 'makebet':
                command = command.slice(7);
                if(!command.startsWith('(') || !command.endsWith(')')) {
                    return message.channel.send('The syntax is incorrect.');
                }
                command = command.substring(1, command.length - 1).trim();
                const paramList = command.split(',');
                if(paramList.length < 2) {
                    return message.channel.send('Not enough items to make a bet.');
                } else if(paramList.length > 11) {
                    return message.channel.send('Exceeded item list for this bet.');
                }
                const failOrID = makeBet(paramList, message.author);
                if(!failOrID) return;
                const guildEmbed = new Discord.MessageEmbed();
                guildEmbed.setColor(embedColor);
                guildEmbed.setAuthor(embedAuthor);
                guildEmbed.setTitle('BET ONLINE');
                let desc = 'This bet is **LIVE**. Please vote below to predict' 
                        + ' the outcome using reactions attached. Only your inital reaction would' 
                        + ' be considered as your final vote. Any changes to your response after' 
                        + ' that **will not** change the stored value. The bet will close in '
                        + (timeout / 1000) + ' seconds, so place your bets quickly! Predicted'
                        + ' winner will be annouced after the bets have closed.\n\nItems for bet:'
                        + '\n\n';
                for(let i = 0; i < paramList.length; i++) {
                    desc += '- **' + paramList[i].toUpperCase() + '**. To bet on '
                            + paramList[i].toUpperCase() + ' react with :' + reactionID[i] + ':\n';
                }
                guildEmbed.setDescription(desc);
                guildEmbed.setTimestamp();
                message.channel.send(guildEmbed).then(msg => {
                    for(let i = 0; i < paramList.length; i++) {
                        msg.react(unicode[i]);
                    }
                    const filter = (reaction, user) => {  // only accept valid emojis
                        return unicode.includes(reaction.emoji.name) && !user.bot;
                    };
                    // reaction collector
                    const collector = msg.createReactionCollector(filter,  { time : timeout });
                    collector.on('collect', (r, user) => {
                        const betData = storedBets.get(failOrID);
                        if(!checkAlreadyBet(failOrID, user.username)) {
                            switch(r.emoji.name) {
                                case '\u0030\u20E3':
                                    betData.zerolist.push(user.username);
                                    break;
                                case '\u0031\u20E3':
                                    betData.onelist.push(user.username);
                                    break;
                                case '\u0032\u20E3':
                                    betData.twolist.push(user.username);
                                    break;
                                case '\u0033\u20E3':
                                    betData.threelist.push(user.username);
                                    break;
                                case '\u0034\u20E3':
                                    betData.fourlist.push(user.username);
                                    break;
                                case '\u0035\u20E3':
                                    betData.fivelist.push(user.username);
                                    break;
                                case '\u0036\u20E3':
                                    betData.sixlist.push(user.username);
                                    break;
                                case '\u0037\u20E3':
                                    betData.sevenlist.push(user.username);
                                    break;
                                case '\u0038\u20E3':
                                    betData.eightlist.push(user.username);
                                    break;
                                case '\u0039\u20E3':
                                    betData.ninelist.push(user.username);
                                    break;
                                case '🔟':
                                    betData.tenlist.push(user.username);
                                    break;
                            }
                        }
                    });
                    collector.on('end', reaction => {
                        let maxSize = -1;
                        let maxIndex = -1;
                        let tieFlag = false;
                        const betData = storedBets.get(failOrID);   
                        if(betData.zerolist.length > maxSize){ 
                            maxSize = betData.zerolist.length;
                            maxIndex = 0;
                        }
                        else if(betData.zerolist.length == maxSize) tieFlag = true;
                        if(betData.onelist.length > maxSize){
                            maxSize = betData.onelist.length;
                            maxIndex = 1;
                            tieFlag = false;
                        }
                        else if(betData.onelist.length == maxSize) tieFlag = true;
                        if(betData.twolist.length > maxSize){ 
                            maxSize = betData.twolist.length;
                            maxIndex = 2;
                            tieFlag = false;
                        }
                        else if(betData.twolist.length == maxSize) tieFlag = true;
                        if(betData.threelist.length > maxSize){ 
                            maxSize = betData.threelist.length;
                            maxIndex = 3;
                            tieFlag = false;
                        }
                        else if(betData.threelist.length == maxSize) tieFlag = true;
                        if(betData.fourlist.length > maxSize){
                            maxSize = betData.fourlist.length;
                            maxIndex = 4;
                            tieFlag = false;
                        }
                        else if(betData.fourlist.length == maxSize) tieFlag = true;
                        if(betData.fivelist.length > maxSize){
                            maxSize = betData.fivelist.length;
                            maxIndex = 5;
                            tieFlag = false;
                        }
                        else if(betData.fivelist.length == maxSize) tieFlag = true;
                        if(betData.sixlist.length > maxSize){
                            maxSize = betData.sixlist.length;
                            maxIndex = 6;
                            tieFlag = false;
                        }
                        else if(betData.sixlist.length == maxSize) tieFlag = true;
                        if(betData.sevenlist.length > maxSize){
                            maxSize = betData.sevenlist.length;
                            maxIndex = 7;
                            tieFlag = false;
                        }
                        else if(betData.sevenlist.length == maxSize) tieFlag = true;
                        if(betData.eightlist.length > maxSize){
                            maxSize = betData.eightlist.length;
                            maxIndex = 8;
                            tieFlag = false;
                        }
                        else if(betData.eightlist.length == maxSize) tieFlag = true;
                        if(betData.ninelist.length > maxSize){ 
                            maxSize = betData.ninelist.length;
                            maxIndex = 9;
                            tieFlag = false;
                        }
                        else if(betData.ninelist.length == maxSize) tieFlag = true;
                        if(betData.tenlist.length > maxSize){ 
                            maxSize = betData.tenlist.length;
                            maxIndex = 10;
                            tieFlag = false;
                        }
                        else if(betData.tenlist.length == maxSize) tieFlag = true;
                        const resultEmbed = new Discord.MessageEmbed();
                        resultEmbed.setColor(embedColor);
                        resultEmbed.setAuthor(embedAuthor);
                        resultEmbed.setTitle('Predicted Results');
                        desc = 'The betting period is over and all bets have been finalized. Any new' 
                                + ' bets won\'t be affecting the outcome of the predicted results.\n';
                        if(tieFlag) {
                            desc += 'The bet was **NOT** able to conclude a predicted winner, as there' 
                                    + 'was a **TIE**';
                        } else {
                            desc += 'The projected Winner is **' + paramList[maxIndex] + '**';
                        }
                        betData.predictedWinner = tieFlag ? 'Tied' : paramList[maxIndex];
                        betData.betSize = maxSize;
                        resultEmbed.setDescription(desc);
                        msg.channel.send(resultEmbed);
                    });
                });
                break;
            case 'showbets':
                return message.channel.send(showBets());
            case 'forcedeclare':
                command = command.slice(12);    
                if(!command.startsWith('(') || !command.endsWith(')')) {
                    return message.channel.send('The syntax is incorrect.');
                }
                command = command.substring(1, command.length - 1).trim();
                const paramList2 = command.split(',');
                paramList2[0] = paramList2[0].trim();
                if(paramList2.length == 2)
                    paramList2[1] = paramList2[1].trim();
                if(paramList2.length === 0) return message.channel.send('This command needs arguments');
                if(paramList2.length > 2) return message.channel.send('There are too many arguments');
                const failOrEmbed = forceDeclare(paramList2)
                if(!failOrEmbed) {
                    return message.channel.send('Failed to remove bet. Please check that you have' 
                            + ' passed in a valid betting ID. If you had a winner as a parameter, please'
                            + ' ensure that the winner is one from the list of betting items');
                }
                message.channel.send('Successfully removed bet with the betting ID `' + paramList2[0] 
                        + '` from the betting list.');
                return message.channel.send(failOrEmbed);
            case 'clearall':
                return message.channel.send(clearList());
        }
    }
});

client.login(Settings['bot-login-token']);      // logs in bot into the server