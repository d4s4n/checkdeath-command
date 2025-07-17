const {
    PATTERNS
} = require('../constants.js');

function cleanNickname(nick) {
    return nick.replace(/[^а-яА-Яa-zA-Z0-9_]/g, '').trim();
}

async function executeCheck(bot, settings) {
    const log = bot.sendLog;

    bot.pluginData.checkDeath.isProcessing = true;
    bot.api.sendMessage('clan', settings.startMessage);

    let collectedMessages = '';
    let clanInfoTimeout;

    const stopCheck = (reason) => {
        if (reason) bot.api.sendMessage('clan', reason);
        bot.pluginData.checkDeath.isProcessing = false;
        bot.pluginData.checkDeath.queue = [];
        bot.removeListener('message', clanInfoListener);
        if (clanInfoTimeout) clearTimeout(clanInfoTimeout);
    };

    const clanInfoListener = (jsonMsg) => {
        const text = jsonMsg.toString().trim();
        collectedMessages += '\n' + text;

        if (PATTERNS.NO_PERMISSION_STATS.test(text)) {
            stopCheck(settings.noPermsMessage);
            return;
        }

        const participantMatch = collectedMessages.match(PATTERNS.PARTICIPANTS) || collectedMessages.match(PATTERNS.MEMBERS);
        if (participantMatch) {
            clearTimeout(clanInfoTimeout);
            bot.removeListener('message', clanInfoListener);
            processPlayerList(participantMatch[1]);
        }
    };

    const processPlayerList = async (rawParticipantsText) => {
        let clanOwner = null;
        const ownerMatch = collectedMessages.match(PATTERNS.OWNER);
        if (ownerMatch) {
            clanOwner = ownerMatch[1];
        }

        const participantLines = rawParticipantsText.split('\n').map(line => line.trim()).filter(line => line);
        let participantsText = participantLines.join(' ');
        participantsText = participantsText.replace(/\s*,\s*/g, ',');
        let participants = participantsText.split(',').map(name => name.trim()).filter(Boolean).map(cleanNickname);

        if (clanOwner && !participants.includes(clanOwner)) {
            participants.push(clanOwner);
        }

        let moderators = [];
        const moderatorsMatch = collectedMessages.match(PATTERNS.MODERATORS);
        if (moderatorsMatch && moderatorsMatch[1].trim() !== '-') {
            moderators = moderatorsMatch[1].split(',').map(name => name.trim()).filter(Boolean).map(cleanNickname);
        }

        const playersToCheck = [];
        for (const player of participants) {
            const playerLower = player.toLowerCase();
            if (playerLower === bot.username.toLowerCase()) continue;
            if (clanOwner && playerLower === clanOwner.toLowerCase()) continue;

            try {
                const user = await bot.api.getUser(player);
                if (user && !user.isOwner && !user.isModerator && !moderators.includes(player)) {
                    playersToCheck.push(player);
                }
            } catch (e) {
                log(`[CheckDeath] Не удалось получить данные игрока ${player}, пропускаю.`)
            }
        }

        if (playersToCheck.length === 0) {
            stopCheck(settings.noPlayersMessage);
            return;
        }

        bot.pluginData.checkDeath.queue = playersToCheck;
        checkNextPlayer();
    };

    clanInfoTimeout = setTimeout(() => {
        stopCheck(settings.clanInfoErrorMessage);
    }, 5000);

    bot.on('message', clanInfoListener);
    bot.api.sendMessage('command', '/c info');

    let kickedPlayers = [];
    const checkNextPlayer = () => {
        const queue = bot.pluginData.checkDeath.queue;
        if (!bot.pluginData.checkDeath.isProcessing) return;

        if (queue.length === 0) {
            const finishMsg = settings.finishMessage.replace('{kickedCount}', kickedPlayers.length);
            stopCheck(finishMsg);
            return;
        }

        const target = queue.shift();
        let statsListener;

        const statsTimeout = setTimeout(() => {
            bot.removeListener('message', statsListener);
            checkNextPlayer();
        }, 4000);

        statsListener = (jsonMsg) => {
            const text = jsonMsg.toString().trim();

            if (PATTERNS.NO_PERMISSION_STATS.test(text)) {
                clearTimeout(statsTimeout);
                bot.removeListener('message', statsListener);
                stopCheck(settings.noPermsMessage);
                return;
            }

            if (!text.includes(`Статистика игрока ${target}`) && !PATTERNS.NOT_IN_CLAN.test(text)) {
                return;
            }

            clearTimeout(statsTimeout);
            bot.removeListener('message', statsListener);

            const match = text.match(PATTERNS.STATS);
            if (match) {
                const deaths = parseInt(match[2], 10);
                if (deaths >= settings.deathsToKick) {
                    bot.api.sendMessage('command', `/c kick ${target}`);
                    kickedPlayers.push(target);
                }
            }
            setTimeout(checkNextPlayer, settings.checkInterval);
        };

        bot.on('message', statsListener);
        bot.api.sendMessage('command', `/c stats ${target}`);
    };
}

module.exports = {
    executeCheck
};