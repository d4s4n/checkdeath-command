const COMMAND_NAME = 'checkdeath';
const PERMISSION_NAME = 'admin.checkdeath';
const PLUGIN_OWNER_ID = 'plugin:checkdeath-command';

const PATTERNS = {
    PARTICIPANTS: /УЧАСТНИКИ:\s*([\s\S]*?)(?=\n(?:Модераторы клана:|Союзные кланы:|Вражеские кланы:|Описание клана:))/i,
    MEMBERS: /Members:\s*([\s\S]*?)(?=\n(?:Модераторы клана:|Союзные кланы:|Вражеские кланы:|Описание клана:))/i,
    OWNER: /Владелец:\s*(\w{3,16})/i,
    MODERATORS: /Модераторы клана:\s*([^\n]*)/i,
    STATS: /Статистика игрока .+: Убийств:\s*(\d+),\s*Смертей:\s*(\d+)/i,
    NO_PERMISSION_STATS: /Просматривать статистику игрока может только|У вас недостаточно прав/i,
    NOT_IN_CLAN: /Игрок не состоит в вашем клане/i,
};

module.exports = {
    COMMAND_NAME,
    PERMISSION_NAME,
    PLUGIN_OWNER_ID,
    PATTERNS,
};