const {
    executeCheck
} = require('./lib/checkDeath.js');
const {
    COMMAND_NAME,
    PERMISSION_NAME,
    PLUGIN_OWNER_ID
} = require('./constants.js');

async function onLoad(bot, options) {
    const log = bot.sendLog;
    const Command = bot.api.Command;
    const settings = options.settings;

    bot.pluginData = bot.pluginData || {};
    bot.pluginData.checkDeath = {
        isProcessing: false,
        queue: [],
    };

    class CheckDeathCommand extends Command {
        constructor() {
            super({
                name: COMMAND_NAME,
                description: 'Запускает или останавливает проверку смертей в клане.',
                aliases: ['чекдез'],
                permissions: PERMISSION_NAME,
                owner: PLUGIN_OWNER_ID,
                allowedChatTypes: ['clan', 'private', 'chat']
            });
        }

        async handler(bot, typeChat, user) {
            const checkDeathData = bot.pluginData.checkDeath;
            if (checkDeathData.isProcessing) {
                checkDeathData.isProcessing = false;
                checkDeathData.queue = [];
                bot.api.sendMessage('clan', settings.stopMessage, user.username);
            } else {
                executeCheck(bot, settings);
            }
        }
    }

    try {
        await bot.api.registerPermissions([{
            name: PERMISSION_NAME,
            description: 'Доступ к команде checkdeath',
            owner: PLUGIN_OWNER_ID
        }]);
        await bot.api.addPermissionsToGroup('Admin', [PERMISSION_NAME]);
        await bot.api.registerCommand(new CheckDeathCommand());
        log(`[${PLUGIN_OWNER_ID}] Команда '${COMMAND_NAME}' успешно зарегистрирована.`);
    } catch (error) {
        log(`[${PLUGIN_OWNER_ID}] Ошибка при загрузке: ${error.message}`);
    }
}

async function onUnload({
    botId,
    prisma
}) {
    console.log(`[${PLUGIN_OWNER_ID}] Удаление ресурсов для бота ID: ${botId}`);
    try {
        await prisma.command.deleteMany({
            where: {
                botId,
                owner: PLUGIN_OWNER_ID
            }
        });
        await prisma.permission.deleteMany({
            where: {
                botId,
                owner: PLUGIN_OWNER_ID
            }
        });
        console.log(`[${PLUGIN_OWNER_ID}] Команды и права плагина удалены.`);
    } catch (error) {
        console.error(`[${PLUGIN_OWNER_ID}] Ошибка при очистке ресурсов:`, error);
    }
}

module.exports = {
    onLoad,
    onUnload,
};