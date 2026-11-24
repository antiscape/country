#!/usr/bin/env python3
"""Build js/data.js from world-countries + World Bank population data.

The raw inputs are cached in /tmp by the build steps; re-download them with:
  curl -L https://registry.npmjs.org/world-countries/-/world-countries-4.0.0.tgz
  curl -L 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2023&per_page=400'
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WC = "/tmp/wc/package/countries.json"
WB = "/tmp/wb.json"

CAPITALS_ZH = {
    "AF": "喀布尔", "AO": "罗安达", "AL": "地拉那", "AD": "安道尔城", "AE": "阿布扎比",
    "AR": "布宜诺斯艾利斯", "AM": "埃里温", "AG": "圣约翰", "AU": "堪培拉", "AT": "维也纳",
    "AZ": "巴库", "BI": "基特加", "BE": "布鲁塞尔", "BJ": "波多诺伏", "BF": "瓦加杜古",
    "BD": "达卡", "BG": "索菲亚", "BH": "麦纳麦", "BS": "拿骚", "BA": "萨拉热窝",
    "BY": "明斯克", "BZ": "贝尔莫潘", "BO": "苏克雷", "BR": "巴西利亚", "BB": "布里奇顿",
    "BN": "斯里巴加湾市", "BT": "廷布", "BW": "哈博罗内", "CF": "班吉", "CA": "渥太华",
    "CH": "伯尔尼", "CL": "圣地亚哥", "CN": "北京", "CI": "亚穆苏克罗", "CM": "雅温得",
    "CD": "金沙萨", "CG": "布拉柴维尔", "CO": "波哥大", "KM": "莫罗尼", "CV": "普拉亚",
    "CR": "圣何塞", "CU": "哈瓦那", "CY": "尼科西亚", "CZ": "布拉格", "DE": "柏林",
    "DJ": "吉布提市", "DM": "罗索", "DK": "哥本哈根", "DO": "圣多明各", "DZ": "阿尔及尔",
    "EC": "基多", "EG": "开罗", "ER": "阿斯马拉", "ES": "马德里", "EE": "塔林",
    "ET": "亚的斯亚贝巴", "FI": "赫尔辛基", "FJ": "苏瓦", "FR": "巴黎", "FM": "帕利基尔",
    "GA": "利伯维尔", "GB": "伦敦", "GE": "第比利斯", "GH": "阿克拉", "GN": "科纳克里",
    "GM": "班珠尔", "GW": "比绍", "GQ": "马拉博", "GR": "雅典", "GD": "圣乔治",
    "GT": "危地马拉城", "GY": "乔治敦", "HN": "特古西加尔巴", "HR": "萨格勒布", "HT": "太子港",
    "HU": "布达佩斯", "ID": "雅加达", "IN": "新德里", "IE": "都柏林", "IR": "德黑兰",
    "IQ": "巴格达", "IS": "雷克雅未克", "IL": "耶路撒冷", "IT": "罗马", "JM": "金斯敦",
    "JO": "安曼", "JP": "东京", "KZ": "阿斯塔纳", "KE": "内罗毕", "KG": "比什凯克",
    "KH": "金边", "KI": "南塔拉瓦", "KN": "巴斯特尔", "KR": "首尔", "KW": "科威特城",
    "LA": "万象", "LB": "贝鲁特", "LR": "蒙罗维亚", "LY": "的黎波里", "LC": "卡斯特里",
    "LI": "瓦杜兹", "LK": "斯里贾亚瓦德纳普拉科特", "LS": "马塞卢", "LT": "维尔纽斯",
    "LU": "卢森堡市", "LV": "里加", "MA": "拉巴特", "MC": "摩纳哥", "MD": "基希讷乌",
    "MG": "塔那那利佛", "MV": "马累", "MX": "墨西哥城", "MH": "马朱罗", "MK": "斯科普里",
    "ML": "巴马科", "MT": "瓦莱塔", "MM": "内比都", "ME": "波德戈里察", "MN": "乌兰巴托",
    "MZ": "马普托", "MR": "努瓦克肖特", "MU": "路易港", "MW": "利隆圭", "MY": "吉隆坡",
    "NA": "温得和克", "NE": "尼亚美", "NG": "阿布贾", "NI": "马那瓜", "NL": "阿姆斯特丹",
    "NO": "奥斯陆", "NP": "加德满都", "NR": "亚伦", "NZ": "惠灵顿", "OM": "马斯喀特",
    "PK": "伊斯兰堡", "PA": "巴拿马城", "PE": "利马", "PH": "马尼拉", "PW": "恩吉鲁穆德",
    "PG": "莫尔兹比港", "PL": "华沙", "KP": "平壤", "PT": "里斯本", "PY": "亚松森",
    "QA": "多哈", "RO": "布加勒斯特", "RU": "莫斯科", "RW": "基加利", "SA": "利雅得",
    "SD": "喀土穆", "SN": "达喀尔", "SG": "新加坡", "SB": "霍尼亚拉", "SL": "弗里敦",
    "SV": "圣萨尔瓦多", "SM": "圣马力诺", "SO": "摩加迪沙", "RS": "贝尔格莱德", "SS": "朱巴",
    "ST": "圣多美", "SR": "帕拉马里博", "SK": "布拉迪斯拉发", "SI": "卢布尔雅那",
    "SE": "斯德哥尔摩", "SZ": "姆巴巴内", "SC": "维多利亚", "SY": "大马士革", "TD": "恩贾梅纳",
    "TG": "洛美", "TH": "曼谷", "TJ": "杜尚别", "TM": "阿什哈巴德", "TL": "帝力",
    "TO": "努库阿洛法", "TT": "西班牙港", "TN": "突尼斯市", "TR": "安卡拉", "TV": "富纳富提",
    "TZ": "多多马", "UG": "坎帕拉", "UA": "基辅", "UY": "蒙得维的亚",
    "US": "华盛顿哥伦比亚特区", "UZ": "塔什干", "VA": "梵蒂冈城", "VC": "金斯敦",
    "VE": "加拉加斯", "VN": "河内", "VU": "维拉港", "WS": "阿皮亚", "YE": "萨那",
    "ZA": "比勒陀利亚", "ZM": "卢萨卡", "ZW": "哈拉雷",
}

CAPITAL_EN_FIX = {
    "BI": "Gitega", "LK": "Sri Jayawardenepura Kotte", "SZ": "Mbabane",
    "ZA": "Pretoria", "BO": "Sucre", "NL": "Amsterdam", "CI": "Yamoussoukro",
    "BJ": "Porto-Novo", "TZ": "Dodoma", "MM": "Naypyidaw", "KZ": "Astana",
    "UA": "Kyiv", "US": "Washington, D.C.", "CV": "Praia", "CZ": "Prague",
}

NAME_ZH_FIX = {
    "CD": "刚果民主共和国", "CG": "刚果共和国", "SZ": "埃斯瓦蒂尼", "VA": "梵蒂冈",
    "FM": "密克罗尼西亚联邦", "BS": "巴哈马", "GM": "冈比亚", "CV": "佛得角",
    "MK": "北马其顿", "KR": "韩国", "KP": "朝鲜", "LA": "老挝", "BN": "文莱",
    "TL": "东帝汶", "ST": "圣多美和普林西比", "VC": "圣文森特和格林纳丁斯",
    "KN": "圣基茨和尼维斯", "AG": "安提瓜和巴布达", "TT": "特立尼达和多巴哥",
    "AE": "阿联酋", "DO": "多米尼加", "DM": "多米尼克", "US": "美国", "GB": "英国",
    "CZ": "捷克", "TR": "土耳其", "NL": "荷兰", "CH": "瑞士", "CN": "中国", "SG": "新加坡",
}

REGION_ZH = {
    "asia": "亚洲", "europe": "欧洲", "africa": "非洲",
    "north-america": "北美洲", "south-america": "南美洲", "oceania": "大洋洲",
}

SUBREGION_ZH = {
    "Northern Africa": "北非", "Western Africa": "西非", "Middle Africa": "中非",
    "Eastern Africa": "东非", "Southern Africa": "南部非洲", "Western Asia": "西亚",
    "Central Asia": "中亚", "Southern Asia": "南亚", "South-Eastern Asia": "东南亚",
    "Eastern Asia": "东亚", "Northern Europe": "北欧", "Western Europe": "西欧",
    "Southern Europe": "南欧", "Eastern Europe": "东欧", "Central Europe": "中欧",
    "North America": "北美洲", "Central America": "中美洲", "Caribbean": "加勒比地区",
    "South America": "南美洲", "Australia and New Zealand": "澳新地区",
    "Melanesia": "美拉尼西亚", "Micronesia": "密克罗尼西亚", "Polynesia": "波利尼西亚",
    "": "",
}

NAME_ES_FIX = {
    "US": "Estados Unidos", "GB": "Reino Unido", "CD": "República Democrática del Congo",
    "CG": "República del Congo", "SZ": "Esuatini", "VA": "Ciudad del Vaticano",
    "CZ": "Chequia", "TR": "Turquía", "NL": "Países Bajos", "KR": "Corea del Sur",
    "KP": "Corea del Norte", "AE": "Emiratos Árabes Unidos", "CI": "Costa de Marfil",
    "TL": "Timor Oriental", "FM": "Micronesia", "CV": "Cabo Verde",
}
NAME_FR_FIX = {
    "US": "États-Unis", "GB": "Royaume-Uni", "CD": "République démocratique du Congo",
    "CG": "République du Congo", "SZ": "Eswatini", "VA": "Cité du Vatican",
    "CZ": "Tchéquie", "TR": "Turquie", "NL": "Pays-Bas", "KR": "Corée du Sud",
    "KP": "Corée du Nord", "AE": "Émirats arabes unis", "CI": "Côte d’Ivoire",
    "TL": "Timor oriental", "FM": "Micronésie", "CV": "Cap-Vert",
}
REGION_EN = {
    "asia": "Asia", "europe": "Europe", "africa": "Africa",
    "north-america": "North America", "south-america": "South America", "oceania": "Oceania",
}
REGION_ES = {
    "asia": "Asia", "europe": "Europa", "africa": "África",
    "north-america": "América del Norte", "south-america": "América del Sur", "oceania": "Oceanía",
}
REGION_FR = {
    "asia": "Asie", "europe": "Europe", "africa": "Afrique",
    "north-america": "Amérique du Nord", "south-america": "Amérique du Sud", "oceania": "Océanie",
}
SUBREGION_ES = {
    "Northern Africa": "África del Norte", "Western Africa": "África Occidental",
    "Middle Africa": "África Central", "Eastern Africa": "África Oriental",
    "Southern Africa": "África Austral", "Western Asia": "Asia Occidental",
    "Central Asia": "Asia Central", "Southern Asia": "Asia del Sur",
    "South-Eastern Asia": "Sudeste Asiático", "Eastern Asia": "Asia Oriental",
    "Northern Europe": "Europa del Norte", "Western Europe": "Europa Occidental",
    "Southern Europe": "Europa del Sur", "Eastern Europe": "Europa del Este",
    "Central Europe": "Europa Central", "North America": "América del Norte",
    "Central America": "América Central", "Caribbean": "Caribe",
    "South America": "América del Sur", "Australia and New Zealand": "Australia y Nueva Zelanda",
    "Melanesia": "Melanesia", "Micronesia": "Micronesia", "Polynesia": "Polinesia", "": "",
}
SUBREGION_FR = {
    "Northern Africa": "Afrique du Nord", "Western Africa": "Afrique de l’Ouest",
    "Middle Africa": "Afrique centrale", "Eastern Africa": "Afrique de l’Est",
    "Southern Africa": "Afrique australe", "Western Asia": "Asie occidentale",
    "Central Asia": "Asie centrale", "Southern Asia": "Asie du Sud",
    "South-Eastern Asia": "Asie du Sud-Est", "Eastern Asia": "Asie de l’Est",
    "Northern Europe": "Europe du Nord", "Western Europe": "Europe de l’Ouest",
    "Southern Europe": "Europe du Sud", "Eastern Europe": "Europe de l’Est",
    "Central Europe": "Europe centrale", "North America": "Amérique du Nord",
    "Central America": "Amérique centrale", "Caribbean": "Caraïbes",
    "South America": "Amérique du Sud", "Australia and New Zealand": "Australie et Nouvelle-Zélande",
    "Melanesia": "Mélanésie", "Micronesia": "Micronésie", "Polynesia": "Polynésie", "": "",
}
CAPITALS_I18N = json.load(open(os.path.join(ROOT, "data", "capitals-i18n.json")))

INDEPENDENCE = {
    "AF": "1919-08-19", "AL": "1912-11-28", "DZ": "1962-07-05", "AO": "1975-11-11",
    "AM": "1991-09-21", "AZ": "1991-10-18", "BH": "1971-08-15", "BD": "1971-03-26",
    "BB": "1966-11-30", "BY": "1991-08-25", "BZ": "1981-09-21", "BJ": "1960-08-01",
    "BO": "1825-08-06", "BA": "1992-03-01", "BW": "1966-09-30", "BR": "1822-09-07",
    "BN": "1984-01-01", "BG": "1908-09-22", "BF": "1960-08-05", "BI": "1962-07-01",
    "KH": "1953-11-09", "CM": "1960-01-01", "CV": "1975-07-05", "CF": "1960-08-13",
    "TD": "1960-08-11", "CL": "1810-09-18", "CO": "1810-07-20", "KM": "1975-07-06",
    "CD": "1960-06-30", "CG": "1960-08-15", "CR": "1821-09-15", "HR": "1991-06-25",
    "CU": "1902-05-20", "CY": "1960-10-01", "CZ": "1918-10-28", "DJ": "1977-06-27",
    "DO": "1844-02-27", "EC": "1822-05-24", "EG": "1922-02-28", "SV": "1821-09-15",
    "GQ": "1968-10-12", "ER": "1993-05-24", "EE": "1918-02-24", "SZ": "1968-09-06",
    "FJ": "1970-10-10", "FI": "1917-12-06", "GA": "1960-08-17", "GM": "1965-02-18",
    "GE": "1991-04-09", "GH": "1957-03-06", "GR": "1821-03-25", "GD": "1974-02-07",
    "GT": "1821-09-15", "GN": "1958-10-02", "GW": "1973-09-24", "GY": "1966-05-26",
    "HT": "1804-01-01", "HN": "1821-09-15", "HU": "1918-11-16", "IS": "1944-06-17",
    "IN": "1947-08-15", "ID": "1945-08-17", "IQ": "1932-10-03", "IE": "1922-12-06",
    "IL": "1948-05-14", "CI": "1960-08-07", "JM": "1962-08-06", "JO": "1946-05-25",
    "KZ": "1991-12-16", "KE": "1963-12-12", "KI": "1979-07-12", "KW": "1961-06-19",
    "KG": "1991-08-31", "LA": "1953-07-22", "LV": "1918-11-18", "LB": "1943-11-22",
    "LS": "1966-10-04", "LR": "1847-07-26", "LY": "1951-12-24", "LT": "1918-02-16",
    "MG": "1960-06-26", "MW": "1964-07-06", "MY": "1957-08-31", "MV": "1965-07-26",
    "ML": "1960-09-22", "MT": "1964-09-21", "MR": "1960-11-28", "MU": "1968-03-12",
    "MX": "1810-09-16", "MD": "1991-08-27", "ME": "2006-06-03", "MA": "1956-03-02",
    "MZ": "1975-06-25", "MM": "1948-01-04", "NA": "1990-03-21", "NR": "1968-01-31",
    "NI": "1821-09-15", "NE": "1960-08-03", "NG": "1960-10-01", "KP": "1948-09-09",
    "MK": "1991-09-08", "NO": "1905-06-07", "PK": "1947-08-14", "PW": "1994-10-01",
    "PA": "1903-11-03", "PG": "1975-09-16", "PY": "1811-05-14", "PE": "1821-07-28",
    "PH": "1898-06-12", "PL": "1918-11-11", "QA": "1971-09-03", "RO": "1877-05-09",
    "RW": "1962-07-01", "KN": "1983-09-19", "LC": "1979-02-22", "VC": "1979-10-27",
    "WS": "1962-01-01", "ST": "1975-07-12", "SA": "1932-09-23", "SN": "1960-04-04",
    "RS": "2006-06-05", "SC": "1976-06-29", "SL": "1961-04-27", "SG": "1965-08-09",
    "SK": "1993-01-01", "SI": "1991-06-25", "SB": "1978-07-07", "SO": "1960-07-01",
    "SS": "2011-07-09", "LK": "1948-02-04", "SD": "1956-01-01", "SR": "1975-11-25",
    "SY": "1946-04-17", "TJ": "1991-09-09", "TZ": "1961-12-09", "TL": "2002-05-20",
    "TG": "1960-04-27", "TO": "1970-06-04", "TT": "1962-08-31", "TN": "1956-03-20",
    "TM": "1991-10-27", "TV": "1978-10-01", "UG": "1962-10-09", "UA": "1991-08-24",
    "AE": "1971-12-02", "UY": "1825-08-25", "US": "1776-07-04", "UZ": "1991-09-01",
    "VU": "1980-07-30", "VE": "1811-07-05", "VN": "1945-09-02", "YE": "1990-05-22",
    "ZM": "1964-10-24", "ZW": "1980-04-18",
}

FAMOUS1 = set("""CA AU NZ FR GB DE IT ES PT NL BE CH SE NO DK FI IE PL GR TR RU UA
JP KR CN IN ID TH VN PH MY SG AE SA IL IR IQ EG ZA NG KE ET MA BR AR CL PE CO VE CU MX
US VA MC IS AT CZ HU RO""".split())

FAMOUS2 = set("""HR RS BG SK SI AL MK ME BA EE LV LT MD BY GE AM AZ KZ UZ TM KG TJ MN
NP BT LK MV KH LA MM BN TL PK AF SY LB JO KW QA OM YE SD SS SO DJ ER RW BI UG TZ MZ
MG MU SC CV ST SN GM GW GN SL LR CI GH TG BJ BF ML NE TD CM GA CG CD AO ZM ZW BW NA
SZ LS MW ZW PY UY BO EC GY SR BZ GT SV HN NI CR PA JM HT DO BB TT BS GD LC VC KN AG
DM FJ PG SB VU WS TO TV KI NR MH FM PW""".split())

FACTS_ZH = {
    "RU": "世界上面积最大的国家，横跨 11 个时区。",
    "CA": "面积世界第二，拥有世界上最长的海岸线。",
    "CN": "陆地面积世界第三，拥有超过 14 亿人口。",
    "US": "面积世界第四，由 50 个州组成。",
    "BR": "南美洲面积最大、人口最多的国家。",
    "AU": "唯一占据整个大陆的国家。",
    "IN": "人口世界第一，拥有丰富的语言与文化。",
    "VA": "世界上面积最小、人口最少的国家。",
    "MC": "面积第二小的国家，以蒙特卡洛闻名。",
    "SG": "城市国家，扼守马六甲海峡要冲。",
    "JP": "由约 1.4 万个岛屿组成的岛国。",
    "ID": "世界上最大的群岛国家。",
    "PH": "由 7000 多个岛屿组成。",
    "NZ": "由南岛、北岛两大主岛组成。",
    "IS": "火山与冰川之国，地热资源丰富。",
    "EG": "金字塔与尼罗河的国度。",
    "ZA": "拥有比勒陀利亚、开普敦等多个首都。",
    "KE": "赤道穿过的东非国家，以野生动物闻名。",
    "ET": "非洲之角的内陆国，是人类发源地之一。",
    "NG": "非洲人口最多的国家。",
    "MX": "玛雅与阿兹特克文明的故乡。",
    "PE": "马丘比丘的所在地。",
    "CL": "世界上最狭长的国家。",
    "AR": "探戈的故乡，南美洲面积第二大国。",
    "CO": "咖啡与生物多样性大国。",
    "VE": "拥有世界落差最大的安赫尔瀑布。",
    "CU": "加勒比地区最大的岛国。",
    "TR": "横跨欧亚两洲的国家。",
    "GR": "西方文明的摇篮，拥有众多岛屿。",
    "IT": "靴子形状的半岛国家，世界遗产众多。",
    "ES": "弗拉门戈与高迪的故乡。",
    "FR": "欧洲面积最大的国家之一，旅游胜地。",
    "DE": "欧洲人口最多的国家。",
    "GB": "由英格兰、苏格兰、威尔士和北爱尔兰组成。",
    "IE": "翡翠岛，以绿色草原闻名。",
    "NL": "地势低洼，四分之一国土低于海平面。",
    "BE": "以巧克力、华夫饼和漫画闻名。",
    "CH": "阿尔卑斯山国，永久中立。",
    "AT": "音乐之都维也纳的所在地。",
    "SE": "北欧面积最大的国家，森林覆盖率极高。",
    "NO": "峡湾之国，拥有漫长的海岸线。",
    "FI": "千湖之国，圣诞老人的故乡。",
    "DK": "童话王国，自行车之城哥本哈根。",
    "PL": "中欧大国，肖邦的故乡。",
    "CZ": "布拉格城堡与百塔之城。",
    "HU": "多瑙河畔的温泉之国。",
    "RO": "吸血鬼传说的故乡特兰西瓦尼亚。",
    "UA": "欧洲面积第二大的国家，黑土地肥沃。",
    "SA": "石油王国，拥有广袤沙漠。",
    "AE": "由七个酋长国组成的联邦。",
    "IL": "三大宗教圣地耶路撒冷所在国。",
    "IR": "波斯文明的继承者，高原国家。",
    "IQ": "两河流域，美索不达米亚文明发源地。",
    "TH": "东南亚唯一未被殖民的国家。",
    "VN": "拥有狭长海岸线的东南亚国家。",
    "MY": "多元文化的东南亚国家。",
    "KR": "朝鲜半岛南部国家，科技与流行文化发达。",
    "KP": "朝鲜半岛北部的国家。",
    "MN": "世界上人口密度最低的国家之一。",
    "KZ": "世界上最大的内陆国。",
    "UZ": "丝绸之路上的双重内陆国。",
    "AF": "兴都库什山脉横贯的内陆国。",
    "NP": "珠穆朗玛峰的所在国。",
    "BT": "以国民幸福总值闻名的山地国。",
    "LK": "印度洋上的宝石之岛。",
    "MV": "由约 1200 个珊瑚岛组成。",
    "KG": "天山山脉中的高山之国。",
    "TJ": "帕米尔高原上的山地国。",
    "TM": "卡拉库姆沙漠与“地狱之门”。",
    "AZ": "里海之滨的“火焰之国”。",
    "GE": "高加索山国，葡萄酒发源地之一。",
    "AM": "世界上第一个基督教国家。",
    "QA": "举办 2022 年世界杯的半岛国家。",
    "KW": "波斯湾石油富国。",
    "BH": "波斯湾岛国。",
    "OM": "阿拉伯半岛东南部的苏丹国。",
    "JO": "佩特拉古城所在地。",
    "LB": "中东小巴黎贝鲁特。",
    "SY": "大马士革古城，世界上最古老的首都之一。",
    "YE": "阿拉伯半岛南端的国家。",
    "SD": "尼罗河上游的国家。",
    "SS": "世界上最年轻的国家之一。",
    "DZ": "非洲面积最大的国家。",
    "MA": "北非门户，撒哈拉与阿特拉斯山。",
    "TN": "迦太基古城与突尼斯老城。",
    "LY": "撒哈拉沙漠覆盖大部分国土。",
    "MR": "撒哈拉与塞内加尔河之间的国家。",
    "ML": "尼日尔河穿过的西非大国。",
    "NE": "撒哈拉沙漠南缘的内陆国。",
    "TD": "乍得湖与撒哈拉南缘。",
    "SN": "西非之角，达喀尔拉力赛起点。",
    "GH": "黄金海岸，西非重要经济体。",
    "CI": "可可生产大国。",
    "CM": "被称为“非洲缩影”，地理与文化多样。",
    "CD": "非洲面积第二大国，拥有刚果雨林。",
    "CG": "刚果河下游的国家。",
    "GA": "赤道雨林与石油资源。",
    "AO": "非洲西南部的葡语国家。",
    "ZM": "赞比西河与维多利亚瀑布。",
    "ZW": "维多利亚瀑布的另一侧。",
    "MZ": "印度洋海岸的葡语国家。",
    "TZ": "乞力马扎罗山与塞伦盖蒂。",
    "UG": "尼罗河源头所在国。",
    "RW": "千丘之国。",
    "BI": "坦噶尼喀湖边的山地国。",
    "MW": "马拉维湖之国。",
    "NA": "纳米布沙漠与骷髅海岸。",
    "BW": "奥卡万戈三角洲。",
    "MG": "世界第四大岛，独特动植物。",
    "MU": "印度洋岛国，渡渡鸟的故乡。",
    "SC": "印度洋群岛国家。",
    "CV": "大西洋岛国。",
    "ST": "几内亚湾岛国。",
    "GQ": "非洲唯一以西班牙语为官方语言的国家。",
    "GM": "冈比亚河两岸的狭长国家。",
    "GW": "西非葡语小国。",
    "SL": "西非海岸国家。",
    "LR": "由自由黑人建立的国家。",
    "GN": "被称为“西非水塔”。",
    "BF": "布基纳法索，意为“正人君子之国”。",
    "TG": "狭长的西非国家。",
    "BJ": "伏都教发源地。",
}

POP_OVERRIDE = {"VA": 800}

def fmt_area_cn(a):
    if a < 1:
        return f"{a:g} 平方公里"
    if a >= 10000:
        v = a / 10000
        return f"{v:.0f} 万平方公里" if v >= 10 else f"{v:.1f} 万平方公里"
    return f"{a:,.0f} 平方公里"

def main():
    countries = json.load(open(WC))
    wb = json.load(open(WB))[1]
    pop = {}
    for row in wb:
        if row.get("value") is not None:
            pop[row["countryiso3code"]] = row["value"]
    pop.update(POP_OVERRIDE)

    rows = []
    for c in countries:
        if not c.get("independent"):
            continue
        code = c["cca2"]
        sub = c.get("subregion") or ""
        if c.get("region") == "Americas":
            region = "south-america" if sub == "South America" else "north-america"
        else:
            region = {
                "Asia": "asia", "Europe": "europe", "Africa": "africa", "Oceania": "oceania",
            }.get(c.get("region"), "asia")
        capital_en = CAPITAL_EN_FIX.get(code)
        if not capital_en:
            capital_en = (c.get("capital") or ["—"])[0]
        name_zh = NAME_ZH_FIX.get(code) or c.get("translations", {}).get("zho", {}).get("common") or c["name"]["common"]
        tr = c.get("translations", {})
        name_es = NAME_ES_FIX.get(code) or tr.get("spa", {}).get("common") or c["name"]["common"]
        name_fr = NAME_FR_FIX.get(code) or tr.get("fra", {}).get("common") or c["name"]["common"]
        cap_i18n = CAPITALS_I18N.get(code, {})
        population = pop.get(c["cca3"], 0)
        population = int(population) if population else 0
        if code == "VA":
            population = 800
        rows.append({
            "id": code,
            "code3": c["cca3"],
            "num": c["ccn3"],
            "name": c["name"]["common"],
            "nameZh": name_zh,
            "nameEs": name_es,
            "nameFr": name_fr,
            "official": c["name"].get("official", ""),
            "capital": capital_en,
            "capitalZh": CAPITALS_ZH[code],
            "capitalEs": cap_i18n.get("es") or capital_en,
            "capitalFr": cap_i18n.get("fr") or capital_en,
            "population": population,
            "area": round(c.get("area") or 0, 2),
            "region": region,
            "regionZh": REGION_ZH[region],
            "regionEn": REGION_EN[region],
            "regionEs": REGION_ES[region],
            "regionFr": REGION_FR[region],
            "subregion": sub,
            "subregionZh": SUBREGION_ZH.get(sub, sub),
            "subregionEs": SUBREGION_ES.get(sub, sub),
            "subregionFr": SUBREGION_FR.get(sub, sub),
            "lat": c.get("latlng", [0, 0])[0],
            "lng": c.get("latlng", [0, 0])[1],
            "borders": len(c.get("borders") or []),
            "landlocked": bool(c.get("landlocked")),
            "independence": INDEPENDENCE.get(code),
            "tier": 2,
            "factZh": FACTS_ZH.get(code, ""),
            "flag": f"/assets/flags/{code.lower()}.png",
        })

    import math
    for r in rows:
        r["_fame"] = math.log10(r["population"] + 10) * 1.1 + math.log10(r["area"] + 10) * 0.7
        if r["id"] in FAMOUS1:
            r["_fame"] += 3
    ranked = sorted(rows, key=lambda r: r["_fame"], reverse=True)
    n = len(ranked)
    for i, r in enumerate(ranked):
        r["tier"] = 1 if i < n * 0.28 else 2 if i < n * 0.62 else 3
        del r["_fame"]

    for key in ("population", "area"):
        ordered = sorted([r for r in rows if r[key] > 0], key=lambda r: r[key], reverse=True)
        for i, r in enumerate(ordered, 1):
            r[f"{key}Rank"] = i

    for r in rows:
        r.setdefault("populationRank", 0)
        r.setdefault("areaRank", 0)
        r["areaTextZh"] = fmt_area_cn(r["area"])

    rows.sort(key=lambda r: r["name"])
    os.makedirs(os.path.join(ROOT, "js"), exist_ok=True)
    out = "// Generated by scripts/build_data.py — do not edit by hand.\n"
    out += "export const REGIONS = " + json.dumps([
        {"id": "world", "zh": "全球", "en": "World", "es": "Mundo", "fr": "Monde"},
        {"id": "asia", "zh": "亚洲", "en": "Asia", "es": "Asia", "fr": "Asie"},
        {"id": "europe", "zh": "欧洲", "en": "Europe", "es": "Europa", "fr": "Europe"},
        {"id": "africa", "zh": "非洲", "en": "Africa", "es": "África", "fr": "Afrique"},
        {"id": "north-america", "zh": "北美洲", "en": "North America", "es": "América del Norte", "fr": "Amérique du Nord"},
        {"id": "south-america", "zh": "南美洲", "en": "South America", "es": "América del Sur", "fr": "Amérique du Sud"},
        {"id": "oceania", "zh": "大洋洲", "en": "Oceania", "es": "Oceanía", "fr": "Océanie"},
    ], ensure_ascii=False, indent=2) + ";\n\n"
    out += "export const COUNTRIES = " + json.dumps(rows, ensure_ascii=False, indent=2) + ";\n\n"
    out += "export const BY_ID = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));\n"
    with open(os.path.join(ROOT, "js", "data.js"), "w") as f:
        f.write(out)
    print(f"wrote {len(rows)} countries")

    missing_cap = [r["id"] for r in rows if r["id"] not in CAPITALS_ZH]
    print("missing capitals:", missing_cap)
    print("with independence:", sum(1 for r in rows if r["independence"]))
    print("tiers:", {t: sum(1 for r in rows if r["tier"] == t) for t in (1, 2, 3)})

if __name__ == "__main__":
    main()
