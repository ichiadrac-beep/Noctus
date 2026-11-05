import { DEVICE_WORDS } from "@/lib/phosphor/lexicon-device";
import { EXTRA_WORDS } from "@/lib/phosphor/lexicon-extra";

export type Lexicon = {
  code: string;
  bcp47: string;
  name: string;
  nativeName: string;
  words: string[];
};

function lex(
  code: string,
  bcp47: string,
  name: string,
  nativeName: string,
  words: string,
): Lexicon {
  return {
    code,
    bcp47,
    name,
    nativeName,
    words: words
      .split("|")
      .map((w) => w.trim())
      .filter(Boolean),
  };
}

export const LEXICONS: Record<string, Lexicon> = {
  en: lex(
    "en",
    "en-GB",
    "English",
    "English",
    "yes|no|hello|help|here|there|now|wait|stop|go|come|stay|look|listen|speak|answer|mother|father|mom|dad|child|baby|son|daughter|brother|sister|family|friend|name|who|what|where|when|why|home|house|door|window|upstairs|downstairs|inside|outside|light|dark|shadow|water|fire|cold|hot|pain|love|fear|death|life|spirit|ghost|peace|sorry|forgive|leave|behind|above|below|today|tonight|yesterday|tomorrow|morning|night|time|soon|never|always|maybe|please|thank you|you|me|we|they|man|woman|boy|girl|old|young|hurt|breath|heart|see|hear|know|remember|forget|lost|found|safe|danger|run|hide|open|close|I'm here|help me|get out|come here|don't go|I love you|I'm sorry|my name|it's cold|behind you|be quiet|not yet|go away|stay here|can you hear|grandfather|grandmother|husband|wife|alive|buried|church|basement|attic|hallway|bedroom|mirror|whisper|cry|laugh|alone|together|follow|north|south|energy|signal|silence",
  ),
  es: lex(
    "es",
    "es-ES",
    "Spanish",
    "Español",
    "sí|no|hola|ayuda|aquí|allí|ahora|espera|para|vete|ven|quédate|mira|escucha|habla|madre|padre|mamá|papá|hijo|hija|niño|nombre|quién|qué|dónde|cuándo|por qué|casa|puerta|ventana|luz|oscuridad|sombra|agua|fuego|frío|calor|dolor|amor|miedo|muerte|vida|espíritu|fantasma|paz|perdón|vete|detrás|arriba|abajo|hoy|esta noche|ayer|mañana|noche|pronto|nunca|siempre|por favor|gracias|yo|tú|nosotros|hombre|mujer|viejo|joven|corazón|ver|oír|recuerda|olvidar|perdido|seguro|peligro|corre|escóndete|abre|cierra|estoy aquí|ayúdame|sal|ven aquí|no te vayas|te quiero|lo siento|mi nombre|hace frío|detrás de ti|silencio|aún no|vete ya|quédate aquí|abuelo|abuela|esposo|esposa|vivo|iglesia|sótano|ático|pasillo|espejo|susurro|llora|ríe|solo|juntos|sígueme|energía|señal",
  ),
  fr: lex(
    "fr",
    "fr-FR",
    "French",
    "Français",
    "oui|non|bonjour|aide|ici|là|maintenant|attends|stop|va|viens|reste|regarde|écoute|parle|mère|père|enfant|nom|qui|quoi|où|pourquoi|maison|porte|lumière|obscurité|ombre|eau|feu|froid|chaud|douleur|amour|peur|mort|vie|esprit|fantôme|paix|pardon|pars|derrière|aujourd'hui|ce soir|nuit|bientôt|jamais|toujours|s'il te plaît|merci|je|tu|nous|homme|femme|cœur|voir|entendre|souviens-toi|perdu|danger|cours|cache-toi|ouvre|ferme|je suis là|aide-moi|sors|viens ici|je t'aime|pardon|mon nom|il fait froid|derrière toi|silence|pas encore|va-t'en|reste ici|grand-père|grand-mère|vivant|église|cave|grenier|couloir|miroir|murmure|seul|ensemble|suis-moi|énergie",
  ),
  de: lex(
    "de",
    "de-DE",
    "German",
    "Deutsch",
    "ja|nein|hallo|hilfe|hier|dort|jetzt|warte|stopp|geh|komm|bleib|sieh|hör|sprich|mutter|vater|kind|name|wer|was|wo|warum|haus|tür|licht|dunkel|schatten|wasser|feuer|kalt|heiß|schmerz|liebe|angst|tod|leben|geist|gespenst|frieden|entschuldigung|geh weg|hinter|heute|heute nacht|nacht|bald|nie|immer|bitte|danke|ich|du|wir|mann|frau|herz|sehen|hören|erinnern|verloren|gefahr|lauf|versteck dich|öffne|schließe|ich bin hier|hilf mir|raus|komm her|ich liebe dich|es tut mir leid|mein name|es ist kalt|hinter dir|still|noch nicht|bleib hier|opa|oma|lebendig|kirche|keller|dachboden|flur|spiegel|flüstern|allein|zusammen|folge|energie",
  ),
  it: lex(
    "it",
    "it-IT",
    "Italian",
    "Italiano",
    "sì|no|ciao|aiuto|qui|lì|adesso|aspetta|ferma|vai|vieni|resta|guarda|ascolta|parla|madre|padre|bambino|nome|chi|cosa|dove|perché|casa|porta|luce|buio|ombra|acqua|fuoco|freddo|caldo|dolore|amore|paura|morte|vita|spirito|fantasma|pace|scusa|vattene|dietro|oggi|stanotte|notte|presto|mai|sempre|per favore|grazie|io|tu|noi|uomo|donna|cuore|vedi|senti|ricorda|perduto|pericolo|corri|nasconditi|apri|chiudi|sono qui|aiutami|esci|vieni qui|ti amo|mi dispiace|il mio nome|fa freddo|dietro di te|zitto|non ancora|resta qui|nonno|nonna|vivo|chiesa|cantina|soffitta|corridoio|specchio|sussurro|solo|insieme|seguimi|energia",
  ),
  pt: lex(
    "pt",
    "pt-PT",
    "Portuguese",
    "Português",
    "sim|não|olá|ajuda|aqui|ali|agora|espera|para|vai|vem|fica|olha|escuta|fala|mãe|pai|criança|nome|quem|o que|onde|porquê|casa|porta|luz|escuridão|sombra|água|fogo|frio|calor|dor|amor|medo|morte|vida|espírito|fantasma|paz|desculpa|sai|atrás|hoje|esta noite|noite|cedo|nunca|sempre|por favor|obrigado|eu|tu|nós|homem|mulher|coração|ver|ouvir|lembra|perdido|perigo|corre|esconde-te|abre|fecha|estou aqui|ajuda-me|sai daqui|vem cá|amo-te|lamento|o meu nome|está frio|atrás de ti|silêncio|ainda não|fica aqui|avô|avó|vivo|igreja|cave|sótão|corredor|espelho|sussurro|sozinho|juntos|segue-me|energia",
  ),
  nl: lex(
    "nl",
    "nl-NL",
    "Dutch",
    "Nederlands",
    "ja|nee|hallo|help|hier|daar|nu|wacht|stop|ga|kom|blijf|kijk|luister|spreek|moeder|vader|kind|naam|wie|wat|waar|waarom|huis|deur|licht|donker|schaduw|water|vuur|koud|heet|pijn|liefde|angst|dood|leven|geest|spook|vrede|sorry|weg|achter|vandaag|vannacht|nacht|snel|nooit|altijd|alsjeblieft|dank je|ik|jij|wij|man|vrouw|hart|zie|hoor|onthoud|verloren|gevaar|ren|verstop je|open|dicht|ik ben hier|help me|ga weg|kom hier|ik hou van je|het spijt me|mijn naam|het is koud|achter je|stil|nog niet|blijf hier|opa|oma|levend|kerk|kelder|zolder|gang|spiegel|fluister|alleen|samen|volg|energie",
  ),
  pl: lex(
    "pl",
    "pl-PL",
    "Polish",
    "Polski",
    "tak|nie|cześć|pomoc|tutaj|tam|teraz|czekaj|stop|idź|chodź|zostań|patrz|słuchaj|mów|matka|ojciec|dziecko|imię|kto|co|gdzie|dlaczego|dom|drzwi|światło|ciemność|cień|woda|ogień|zimno|gorąco|ból|miłość|strach|śmierć|życie|duch|duch|pokój|przepraszam|odejdź|za|dziś|dziś w nocy|noc|wkrótce|nigdy|zawsze|proszę|dziękuję|ja|ty|my|mężczyzna|kobieta|serce|widzę|słyszę|pamiętaj|zgubiony|niebezpieczeństwo|biegnij|schowaj się|otwórz|zamknij|jestem tutaj|pomóż mi|wyjdź|chodź tutaj|kocham cię|przykro mi|moje imię|jest zimno|za tobą|cicho|jeszcze nie|zostań tutaj|dziadek|babcia|żywy|kościół|piwnica|strych|korytarz|lustro|szept|sam|razem|chodź za mną|energia",
  ),
  ru: lex(
    "ru",
    "ru-RU",
    "Russian",
    "Русский",
    "да|нет|привет|помощь|здесь|там|сейчас|жди|стоп|иди|останься|смотри|слушай|говори|мама|папа|ребёнок|имя|кто|что|где|почему|дом|дверь|свет|тьма|тень|вода|огонь|холодно|горячо|боль|любовь|страх|смерть|жизнь|дух|призрак|мир|прости|уходи|позади|сегодня|ночь|скоро|никогда|всегда|пожалуйста|спасибо|я|ты|мы|мужчина|женщина|сердце|вижу|слышу|помни|потерян|опасность|беги|прячься|открой|закрой|я здесь|помоги|выйди|иди сюда|я люблю|мне жаль|моё имя|холодно|позади тебя|тихо|ещё нет|останься|дедушка|бабушка|живой|церковь|подвал|чердак|коридор|зеркало|шёпот|один|вместе|следуй|энергия",
  ),
  uk: lex(
    "uk",
    "uk-UA",
    "Ukrainian",
    "Українська",
    "так|ні|привіт|допомога|тут|там|зараз|чекай|стій|йди|дивись|слухай|говори|мама|тато|дитина|ім'я|хто|що|де|чому|дім|двері|світло|темрява|тінь|вода|вогонь|холодно|гаряче|біль|любов|страх|смерть|життя|дух|привид|мир|пробач|йди геть|позаду|сьогодні|ніч|скоро|ніколи|завжди|будь ласка|дякую|я|ти|ми|чоловік|жінка|серце|бачу|чую|пам'ятай|загублений|небезпека|біжи|ховайся|відкрий|закрий|я тут|допоможи|вийди|іди сюди|я люблю|мені шкода|моє ім'я|холодно|позаду тебе|тихо|ще ні|залишайся|дідусь|бабуся|живий|церква|підвал|горище|коридор|дзеркало|шепіт|один|разом|іди за мною|енергія",
  ),
  hi: lex(
    "hi",
    "hi-IN",
    "Hindi",
    "हिन्दी",
    "हाँ|नहीं|नमस्ते|मदद|यहाँ|वहाँ|अब|रुको|जाओ|आओ|रहना|देखो|सुनो|बोलो|माँ|पिता|बच्चा|नाम|कौन|क्या|कहाँ|क्यों|घर|दरवाज़ा|रोशनी|अंधेरा|परछाईं|पानी|आग|ठंड|गर्मी|दर्द|प्यार|डर|मौत|जीवन|आत्मा|भूत|शांति|माफ़|चले जाओ|पीछे|आज|आज रात|रात|जल्दी|कभी नहीं|हमेशा|कृपया|धन्यवाद|मैं|तुम|हम|आदमी|औरत|दिल|देखता हूँ|सुनता हूँ|याद|खोया|खतरा|भागो|छुपो|खोलो|बंद करो|मैं यहाँ हूँ|मदद करो|बाहर जाओ|यहाँ आओ|मैं प्यार करता हूँ|मुझे माफ़ करो|मेरा नाम|बहुत ठंड है|तुम्हारे पीछे|चुप|अभी नहीं|यहीं रहो|दादा|दादी|जीवित|मंदिर|तहखाना|सीढ़ियाँ|आईना|फुसफुसाहट|अकेला|साथ|पीछे आओ|ऊर्जा",
  ),
  ta: lex(
    "ta",
    "ta-IN",
    "Tamil",
    "தமிழ்",
    "ஆம்|இல்லை|வணக்கம்|உதவி|இங்கே|அங்கே|இப்போது|காத்திரு|நில்|போ|வா|இரு|பார்|கேள்|பேசு|அம்மா|அப்பா|குழந்தை|பெயர்|யார்|என்ன|எங்கே|ஏன்|வீடு|கதவு|ஒளி|இருட்டு|நிழல்|தண்ணீர்|நெருப்பு|குளிர்|சூடு|வலி|அன்பு|பயம்|இறப்பு|வாழ்க்கை|ஆவி|பேய்|அமைதி|மன்னிச்சு|வெளியேறு|பின்னால்|இன்று|இன்று இரவு|இரவு|விரைவில்|ஒருபோதும்|எப்போதும்|தயவு செய்து|நன்றி|நான்|நீ|நாம்|ஆண்|பெண்|இதயம்|பார்க்கிறேன்|கேட்கிறேன்|நினைவு|தொலைந்த|ஆபத்து|ஓடு|ஒளிந்துகொள்|திற|மூடு|நான் இங்கே இருக்கிறேன்|உதவி செய்|வெளியே போ|இங்கே வா|நான் உன்னை நேசிக்கிறேன்|மன்னிக்கவும்|என் பெயர்|குளிராக இருக்கிறது|உனக்குப் பின்னால்|அமைதியாக|இன்னும் இல்லை|இங்கேயே இரு|தாத்தா|பாட்டி|உயிருடன்|கோவில்|அடித்தளம்|படிக்கட்டு|கண்ணாடி|குசுகுசு|தனியாக|ஒன்றாக|பின்வா|ஆற்றல்",
  ),
  bn: lex(
    "bn",
    "bn-IN",
    "Bengali",
    "বাংলা",
    "হ্যাঁ|না|নমস্কার|সাহায্য|এখানে|সেখানে|এখন|অপেক্ষা|থামো|যাও|এসো|থাকো|দেখো|শোনো|বলো|মা|বাবা|শিশু|নাম|কে|কী|কোথায়|কেন|বাড়ি|দরজা|আলো|অন্ধকার|ছায়া|জল|আগুন|ঠান্ডা|গরম|ব্যথা|ভালোবাসা|ভয়|মৃত্যু|জীবন|আত্মা|ভূত|শান্তি|ক্ষমা|চলে যাও|পেছনে|আজ|আজ রাত|রাত|শীঘ্রই|কখনও না|সবসময়|দয়া করে|ধন্যবাদ|আমি|তুমি|আমরা|পুরুষ|নারী|হৃদয়|দেখি|শুনি|মনে রেখো|হারানো|বিপদ|দৌড়াও|লুকাও|খোলো|বন্ধ করো|আমি এখানে|সাহায্য করো|বেরিয়ে যাও|এখানে এসো|আমি ভালোবাসি|দুঃখিত|আমার নাম|খুব ঠান্ডা|তোমার পেছনে|চুপ|এখনও না|এখানে থাকো|দাদু|দিদা|জীবিত|মন্দির|বেসমেন্ট|সিঁড়ি|আয়না|ফিসফিস|একা|একসাথে|পিছু এসো|শক্তি",
  ),
  ur: lex(
    "ur",
    "ur-PK",
    "Urdu",
    "اردو",
    "ہاں|نہیں|سلام|مدد|یہاں|وہاں|اب|انتظار|رکو|جاؤ|آؤ|رہو|دیکھو|سنو|بولو|ماں|والد|بچہ|نام|کون|کیا|کہاں|کیوں|گھر|دروازہ|روشنی|اندھیرا|سایہ|پانی|آگ|سرد|گرم|درد|محبت|خوف|موت|زندگی|روح|بھوت|امن|معاف|چلے جاؤ|پیچھے|آج|آج رات|رات|جلد|کبھی نہیں|ہمیشہ|براہ کرم|شکریہ|میں|تم|ہم|مرد|عورت|دل|دیکھتا ہوں|سنتا ہوں|یاد|کھویا|خطرہ|بھاگو|چھپو|کھولو|بند کرو|میں یہاں ہوں|میری مدد کرو|باہر جاؤ|یہاں آؤ|میں تم سے محبت کرتا ہوں|معذرت|میرا نام|بہت سردی ہے|تمہارے پیچھے|خاموش|ابھی نہیں|یہیں رہو|دادا|دادی|زندہ|مسجد|تہہ خانہ|سیڑھیاں|آئینہ|سرگوشی|اکیلا|ساتھ|پیچھے آؤ|توانائی",
  ),
  si: lex(
    "si",
    "si-LK",
    "Sinhala",
    "සිංහල",
    "ඔව්|නැහැ|ආයුබෝවන්|උදව්|මෙතන|එතන|දැන්|ඉන්න|නවත්වන්න|යන්න|එන්න|රැඳෙන්න|බලන්න|අහන්න|කතා කරන්න|අම්මා|තාත්තා|ළමයා|නම|කවුද|මොකක්ද|කොහෙද|ඇයි|ගෙදර|දොර|එළිය|අඳුර|සෙවනැල්ල|වතුර|ගින්දර|සීතල|රස්නේ|වේදනාව|ආදරය|බය|මරණය|ජීවිතය|ආත්මය|අවතාරය|සාමය|සමාවන්න|යන්න|පිටුපස|අද|අද රෑ|රෑ|ඉක්මනින්|කවදාවත් නැහැ|සැමදා|කරුණාකරලා|ස්තූතියි|මම|ඔබ|අපි|මිනිහා|ගෑණි|හදවත|දකිනවා|ඇහෙනවා|මතක|නැති වුණා|අනතුර|දුවන්න|හංගෙන්න|අරින්න|වහන්න|මම මෙතන|උදව් කරන්න|පිටතට යන්න|මෙතනට එන්න|මම ආදරෙයි|සමාවෙන්න|මගේ නම|හරි සීතල|ඔබ පිටුපස|නිශ්ශබ්ද|තාම නැහැ|මෙතනම ඉන්න|සීයා|ආච්චි|ජීවතුන් අතර|පන්සල|බිම් මහල|පඩිපෙළ|කැඩපත|මුමුණන්න|තනියම|එකට|පස්සෙන් එන්න|ශක්තිය",
  ),
  ne: lex(
    "ne",
    "ne-NP",
    "Nepali",
    "नेपाली",
    "हो|होइन|नमस्ते|मद्दत|यहाँ|त्यहाँ|अहिले|पर्ख|रोक|जाऊ|आउ|बस|हेर|सुन|बोल|आमा|बुबा|बच्चा|नाम|को|के|कहाँ|किन|घर|ढोका|उज्यालो|अँध्यारो|छाया|पानी|आगो|चिसो|तातो|दुखाइ|माया|डर|मृत्यु|जीवन|आत्मा|भूत|शान्ति|माफ|जाऊ|पछाडि|आज|आज राति|रात|छिट्टै|कहिल्यै होइन|सधैं|कृपया|धन्यवाद|म|तिमी|हामी|मान्छे|आइमाई|मुटु|देख्छु|सुन्छु|सम्झ|हरायो|खतरा|दौड|लुक|खोल|बन्द गर|म यहाँ छु|मद्दत गर|बाहिर जाऊ|यहाँ आउ|माया गर्छु|माफ गर|मेरो नाम|चिसो छ|तिम्रो पछाडि|शान्त|अझै होइन|यही बस|हजुरबुबा|हजुरआमा|जीवित|मन्दिर|भुइँ तला|सीढी|ऐना|कानाफुसी|एक्लो|सँगै|पछि आउ|ऊर्जा",
  ),
  ja: lex(
    "ja",
    "ja-JP",
    "Japanese",
    "日本語",
    "はい|いいえ|こんにちは|助けて|ここ|そこ|今|待って|止まれ|行け|来て|残って|見て|聞いて|話して|母|父|子供|名前|誰|何|どこ|なぜ|家|ドア|光|闇|影|水|火|寒い|熱い|痛み|愛|怖い|死|命|霊|幽霊|平和|ごめん|出て|後ろ|今日|今夜|夜|もうすぐ|決して|いつも|お願い|ありがとう|私|あなた|私たち|男|女|心|見える|聞こえる|覚えて|迷子|危険|走って|隠れて|開けて|閉めて|私はここ|助けてくれ|出て行け|ここに来て|愛してる|ごめんね|私の名前|寒いよ|あなたの後ろ|静かに|まだ|ここにいて|祖父|祖母|生きている|神社|地下室|階段|鏡|ささやき|ひとり|一緒|ついて来て|エネルギー",
  ),
  ko: lex(
    "ko",
    "ko-KR",
    "Korean",
    "한국어",
    "네|아니요|안녕|도와줘|여기|거기|지금|기다려|멈춰|가|와|남아|봐|들어|말해|엄마|아빠|아이|이름|누구|뭐|어디|왜|집|문|빛|어둠|그림자|물|불|추워|뜨거워|아파|사랑|무서워|죽음|삶|영혼|귀신|평화|미안|나가|뒤에|오늘|오늘 밤|밤|곧|절대|항상|제발|고마워|나|너|우리|남자|여자|심장|보여|들려|기억해|잃었어|위험|뛰어|숨어|열어|닫아|나 여기 있어|도와줘|나가|이리 와|사랑해|미안해|내 이름|추워|네 뒤에|조용히|아직|여기 있어|할아버지|할머니|살아 있어|교회|지하|계단|거울|속삭임|혼자|함께|따라와|에너지",
  ),
  zh: lex(
    "zh",
    "zh-CN",
    "Chinese",
    "中文",
    "是|不|你好|帮助|这里|那里|现在|等等|停下|走|来|留下|看|听|说|妈妈|爸爸|孩子|名字|谁|什么|哪里|为什么|家|门|光|黑暗|影子|水|火|冷|热|疼|爱|害怕|死亡|生命|灵魂|鬼|和平|对不起|离开|后面|今天|今晚|夜晚|很快|从不|总是|请|谢谢|我|你|我们|男人|女人|心|看见|听见|记住|迷路|危险|跑|躲|开门|关门|我在这里|帮我|出去|过来|我爱你|对不起|我的名字|好冷|在你后面|安静|还没有|留在这里|爷爷|奶奶|活着|庙|地下室|楼梯|镜子|低语|一个人|一起|跟着我|能量",
  ),
  ar: lex(
    "ar",
    "ar-SA",
    "Arabic",
    "العربية",
    "نعم|لا|مرحبا|مساعدة|هنا|هناك|الآن|انتظر|توقف|اذهب|تعال|ابق|انظر|اسمع|تكلم|أم|أب|طفل|اسم|من|ماذا|أين|لماذا|بيت|باب|نور|ظلام|ظل|ماء|نار|بارد|حار|ألم|حب|خوف|موت|حياة|روح|شبح|سلام|آسف|ارحل|خلف|اليوم|الليلة|ليل|قريبا|أبدا|دائما|من فضلك|شكرا|أنا|أنت|نحن|رجل|امرأة|قلب|أرى|أسمع|تذكر|ضائع|خطر|اركض|اختبئ|افتح|أغلق|أنا هنا|ساعدني|اخرج|تعال هنا|أحبك|آسف|اسمي|الجو بارد|خلفك|اهدأ|ليس بعد|ابق هنا|جدي|جدتي|حي|مسجد|قبو|درج|مرآة|همس|وحيد|معا|اتبعني|طاقة",
  ),
  tr: lex(
    "tr",
    "tr-TR",
    "Turkish",
    "Türkçe",
    "evet|hayır|merhaba|yardım|burada|orada|şimdi|bekle|dur|git|gel|kal|bak|dinle|konuş|anne|baba|çocuk|isim|kim|ne|nerede|neden|ev|kapı|ışık|karanlık|gölge|su|ateş|soğuk|sıcak|acı|aşk|korku|ölüm|hayat|ruh|hayalet|huzur|özür|git|arkada|bugün|bu gece|gece|yakında|asla|her zaman|lütfen|teşekkürler|ben|sen|biz|adam|kadın|kalp|görüyorum|duyuyorum|hatırla|kayıp|tehlike|koş|saklan|aç|kapat|buradayım|yardım et|çık|buraya gel|seni seviyorum|üzgünüm|adım|çok soğuk|arkandayım|sessiz|henüz değil|burada kal|dede|nine|canlı|cami|bodrum|merdiven|ayna|fısıltı|yalnız|birlikte|beni izle|enerji",
  ),
  id: lex(
    "id",
    "id-ID",
    "Indonesian",
    "Indonesia",
    "ya|tidak|halo|tolong|di sini|di sana|sekarang|tunggu|berhenti|pergi|datang|tinggal|lihat|dengar|bicara|ibu|ayah|anak|nama|siapa|apa|di mana|mengapa|rumah|pintu|cahaya|gelap|bayangan|air|api|dingin|panas|sakit|cinta|takut|mati|hidup|roh|hantu|damai|maaf|pergi|di belakang|hari ini|malam ini|malam|segera|tidak pernah|selalu|tolong|terima kasih|saya|kamu|kami|pria|wanita|hati|melihat|mendengar|ingat|hilang|bahaya|lari|sembunyi|buka|tutup|saya di sini|tolong saya|keluar|ke sini|aku cinta kamu|maafkan|nama saya|dingin sekali|di belakangmu|diam|belum|tinggal di sini|kakek|nenek|hidup|masjid|ruang bawah|tangga|cermin|bisikan|sendiri|bersama|ikuti saya|energi",
  ),
  ms: lex(
    "ms",
    "ms-MY",
    "Malay",
    "Melayu",
    "ya|tidak|hello|tolong|di sini|di sana|sekarang|tunggu|berhenti|pergi|datang|tinggal|lihat|dengar|cakap|ibu|bapa|anak|nama|siapa|apa|di mana|mengapa|rumah|pintu|cahaya|gelap|bayang|air|api|sejuk|panas|sakit|cinta|takut|mati|hidup|roh|hantu|damai|maaf|pergilah|di belakang|hari ini|malam ini|malam|segera|tidak pernah|selalu|tolong|terima kasih|saya|awak|kami|lelaki|perempuan|hati|nampak|dengar|ingat|hilang|bahaya|lari|sembunyi|buka|tutup|saya di sini|tolong saya|keluar|ke mari|saya sayang awak|maafkan|nama saya|sejuk sangat|di belakang awak|diam|belum|tinggal di sini|datuk|nenek|hidup|masjid|bawah tanah|tangga|cermin|bisikan|seorang diri|bersama|ikut saya|tenaga",
  ),
  th: lex(
    "th",
    "th-TH",
    "Thai",
    "ไทย",
    "ใช่|ไม่|สวัสดี|ช่วยด้วย|ที่นี่|ที่นั่น|ตอนนี้|รอ|หยุด|ไป|มา|อยู่|ดู|ฟัง|พูด|แม่|พ่อ|เด็ก|ชื่อ|ใคร|อะไร|ที่ไหน|ทำไม|บ้าน|ประตู|แสง|มืด|เงา|น้ำ|ไฟ|หนาว|ร้อน|เจ็บ|รัก|กลัว|ตาย|ชีวิต|วิญญาณ|ผี|สงบ|โทษ|ออกไป|ข้างหลัง|วันนี้|คืนนี้|กลางคืน|เร็วๆ นี้|ไม่เคย|เสมอ|ได้โปรด|ขอบคุณ|ฉัน|คุณ|เรา|ผู้ชาย|ผู้หญิง|หัวใจ|เห็น|ได้ยิน|จำ|หาย|อันตราย|วิ่ง|ซ่อน|เปิด|ปิด|ฉันอยู่ที่นี่|ช่วยฉัน|ออกไป|มาที่นี่|รักนะ|ขอโทษ|ชื่อฉัน|หนาวมาก|ข้างหลังคุณ|เงียบ|ยัง|อยู่ที่นี่|ปู่|ย่า|มีชีวิต|วัด|ห้องใต้ดิน|บันได|กระจก|กระซิบ|คนเดียว|ด้วยกัน|ตามฉันมา|พลังงาน",
  ),
  vi: lex(
    "vi",
    "vi-VN",
    "Vietnamese",
    "Tiếng Việt",
    "có|không|xin chào|giúp|đây|đó|bây giờ|đợi|dừng|đi|đến|ở lại|nhìn|nghe|nói|mẹ|cha|con|tên|ai|gì|đâu|tại sao|nhà|cửa|ánh sáng|bóng tối|bóng|nước|lửa|lạnh|nóng|đau|yêu|sợ|chết|sống|linh hồn|ma|bình yên|xin lỗi|đi đi|phía sau|hôm nay|đêm nay|đêm|sớm|không bao giờ|luôn luôn|làm ơn|cảm ơn|tôi|bạn|chúng tôi|đàn ông|đàn bà|tim|thấy|nghe|nhớ|lạc|nguy hiểm|chạy|trốn|mở|đóng|tôi ở đây|giúp tôi|ra ngoài|đến đây|tôi yêu bạn|tôi xin lỗi|tên tôi|lạnh quá|phía sau bạn|im lặng|chưa|ở lại đây|ông|bà|còn sống|chùa|tầng hầm|cầu thang|gương|thì thầm|một mình|cùng nhau|theo tôi|năng lượng",
  ),
  sv: lex(
    "sv",
    "sv-SE",
    "Swedish",
    "Svenska",
    "ja|nej|hej|hjälp|här|där|nu|vänta|stanna|gå|kom|stanna kvar|titta|lyssna|tala|mamma|pappa|barn|namn|vem|vad|var|varför|hem|dörr|ljus|mörker|skugga|vatten|eld|kall|varm|smärta|kärlek|rädsla|död|liv|ande|spöke|frid|förlåt|gå härifrån|bakom|idag|i natt|natt|snart|aldrig|alltid|snälla|tack|jag|du|vi|man|kvinna|hjärta|ser|hör|minns|vilse|fara|spring|göm dig|öppna|stäng|jag är här|hjälp mig|ut|kom hit|jag älskar dig|förlåt mig|mitt namn|det är kallt|bakom dig|tyst|inte än|stanna här|farfar|mormor|levande|kyrka|källare|vind|korridor|spegel|viskning|ensam|tillsammans|följ mig|energi",
  ),
  no: lex(
    "no",
    "nb-NO",
    "Norwegian",
    "Norsk",
    "ja|nei|hei|hjelp|her|der|nå|vent|stopp|gå|kom|bli|se|hør|snakk|mamma|pappa|barn|navn|hvem|hva|hvor|hvorfor|hjem|dør|lys|mørke|skygge|vann|ild|kald|varm|smerte|kjærlighet|frykt|død|liv|ånd|spøkelse|fred|unnskyld|gå bort|bak|i dag|i natt|natt|snart|aldri|alltid|vær så snill|takk|jeg|du|vi|mann|kvinne|hjerte|ser|hører|husk|borte|fare|løp|gjem deg|åpne|lukk|jeg er her|hjelp meg|ut|kom hit|jeg elsker deg|unnskyld meg|navnet mitt|det er kaldt|bak deg|stille|ikke ennå|bli her|bestefar|bestemor|levende|kirke|kjeller|loft|gang|speil|hvisking|alene|sammen|følg meg|energi",
  ),
  da: lex(
    "da",
    "da-DK",
    "Danish",
    "Dansk",
    "ja|nej|hej|hjælp|her|der|nu|vent|stop|gå|kom|bliv|se|lyt|tal|mor|far|barn|navn|hvem|hvad|hvor|hvorfor|hjem|dør|lys|mørke|skygge|vand|ild|kold|varm|smerte|kærlighed|frygt|død|liv|ånd|spøgelse|fred|undskyld|gå væk|bag|i dag|i nat|nat|snart|aldrig|altid|vær så venlig|tak|jeg|du|vi|mand|kvinde|hjerte|ser|hører|husk|væk|fare|løb|gem dig|åbn|luk|jeg er her|hjælp mig|ud|kom her|jeg elsker dig|undskyld mig|mit navn|det er koldt|bag dig|stille|ikke endnu|bliv her|bedstefar|bedstemor|levende|kirke|kælder|loft|gang|spejl|hvisken|alene|sammen|følg mig|energi",
  ),
  fi: lex(
    "fi",
    "fi-FI",
    "Finnish",
    "Suomi",
    "kyllä|ei|hei|apua|täällä|siellä|nyt|odota|seis|mene|tule|jää|katso|kuuntele|puhu|äiti|isä|lapsi|nimi|kuka|mitä|missä|miksi|koti|ovi|valo|pimeä|varjo|vesi|tuli|kylmä|kuuma|kipu|rakkaus|pelko|kuolema|elämä|henki|kummitus|rauha|anteeksi|lähde|takana|tänään|tänä yönä|yö|pian|ei koskaan|aina|ole hyvä|kiitos|minä|sinä|me|mies|nainen|sydän|näen|kuulen|muista|eksynyt|vaara|juokse|piiloudu|avaa|sulje|olen täällä|auta minua|ulos|tule tänne|rakastan sinua|anteeksi|nimeni|on kylmä|takanasi|hiljaa|ei vielä|jää tänne|vaari|mummo|elossa|kirkko|kellari|ullakko|käytävä|peili|kuiskaus|yksin|yhdessä|seuraa minua|energia",
  ),
  el: lex(
    "el",
    "el-GR",
    "Greek",
    "Ελληνικά",
    "ναι|όχι|γεια|βοήθεια|εδώ|εκεί|τώρα|περίμενε|σταμάτα|πήγαινε|έλα|μείνε|κοίτα|άκου|μίλα|μητέρα|πατέρας|παιδί|όνομα|ποιος|τι|πού|γιατί|σπίτι|πόρτα|φως|σκοτάδι|σκιά|νερό|φωτιά|κρύο|ζέστη|πόνος|αγάπη|φόβος|θάνατος|ζωή|πνεύμα|φάντασμα|ειρήνη|συγγνώμη|φύγε|πίσω|σήμερα|απόψε|νύχτα|σύντομα|ποτέ|πάντα|παρακαλώ|ευχαριστώ|εγώ|εσύ|εμείς|άντρας|γυναίκα|καρδιά|βλέπω|ακούω|θυμήσου|χαμένος|κίνδυνος|τρέξε|κρύψου|άνοιξε|κλείσε|είμαι εδώ|βοήθησέ με|έξω|έλα εδώ|σ' αγαπώ|συγγνώμη|το όνομά μου|κάνει κρύο|πίσω σου|ησυχία|όχι ακόμα|μείνε εδώ|παππούς|γιαγιά|ζωντανός|εκκλησία|υπόγειο|σκάλα|καθρέφτης|ψίθυρος|μόνος|μαζί|ακολούθησέ με|ενέργεια",
  ),
  he: lex(
    "he",
    "he-IL",
    "Hebrew",
    "עברית",
    "כן|לא|שלום|עזרה|כאן|שם|עכשיו|חכה|עצור|לך|בוא|הישאר|תסתכל|תקשיב|דבר|אמא|אבא|ילד|שם שלי|מי|מה|איפה|למה|בית|דלת|אור|חושך|צל|מים|אש|קר|חם|כאב|אהבה|פחד|מוות|חיים|רוח|רוח רפאים|שלום|סליחה|צא|מאחור|היום|הלילה|לילה|בקרוב|אף פעם|תמיד|בבקשה|תודה|אני|אתה|אנחנו|איש|אישה|לב|רואה|שומע|תזכור|אבוד|סכנה|רוץ|תחבא|פתח|סגור|אני כאן|תעזור לי|צא החוצה|בוא לכאן|אני אוהב אותך|סליחה|השם שלי|קר מאוד|מאחוריך|שקט|עדיין לא|הישאר כאן|סבא|סבתא|חי|בית כנסת|מרתף|מדרגות|מראה|לחישה|לבד|יחד|בוא אחריי|אנרגיה",
  ),
  ro: lex(
    "ro",
    "ro-RO",
    "Romanian",
    "Română",
    "da|nu|salut|ajutor|aici|acolo|acum|așteaptă|stop|du-te|vino|rămâi|uită-te|ascultă|vorbește|mamă|tată|copil|nume|cine|ce|unde|de ce|casă|ușă|lumină|întuneric|umbră|apă|foc|frig|cald|durere|dragoste|frică|moarte|viață|spirit|fantomă|pace|scuze|pleacă|în spate|azi|diseară|noapte|curând|niciodată|mereu|te rog|mulțumesc|eu|tu|noi|bărbat|femeie|inimă|văd|aud|amintește-ți|pierdut|pericol|fugi|ascunde-te|deschide|închide|sunt aici|ajută-mă|ieși|vino aici|te iubesc|îmi pare rău|numele meu|e frig|în spatele tău|liniște|nu încă|rămâi aici|bunic|bunică|viu|biserică|beci|pod|hol|oglindă|șoaptă|singur|împreună|urmează-mă|energie",
  ),
  hu: lex(
    "hu",
    "hu-HU",
    "Hungarian",
    "Magyar",
    "igen|nem|szia|segítség|itt|ott|most|várj|állj|menj|gyere|maradj|nézd|hallgasd|beszélj|anya|apa|gyerek|név|ki|mi|hol|miért|otthon|ajtó|fény|sötét|árnyék|víz|tűz|hideg|meleg|fájdalom|szerelem|félelem|halál|élet|szellem|kísértet|béke|bocsánat|menj el|mögött|ma|ma éjjel|éjjel|hamar|soha|mindig|kérlek|köszönöm|én|te|mi|férfi|nő|szív|látom|hallom|emlékezz|elveszett|veszély| fuss|bújj el|nyisd ki|zárd be|itt vagyok|segíts|ki|gyere ide|szeretlek|sajnálom|a nevem|hideg van|mögötted|csend|még nem|maradj itt|nagypapa|nagymama|élő|templom|pince|padlás|folyosó|tükör|suttogás|egyedül|együtt|kövess|energia",
  ),
  cs: lex(
    "cs",
    "cs-CZ",
    "Czech",
    "Čeština",
    "ano|ne|ahoj|pomoc|tady|tam|teď|čekej|stop|jdi|pojď|zůstaň|podívej|poslouchej|mluv|matka|otec|dítě|jméno|kdo|co|kde|proč|domov|dveře|světlo|tma|stín|voda|oheň|zima|horko|bolest|láska|strach|smrt|život|duch|přízrak|mír|promiň|odejdi|za|dnes|dnes v noci|noc|brzy|nikdy|vždy|prosím|děkuji|já|ty|my|muž|žena|srdce|vidím|slyším|pamatuj|ztracený|nebezpečí|utíkej|schovej se|otevři|zavři|jsem tady|pomoz mi|ven|pojď sem|miluji tě|je mi líto|moje jméno|je zima|za tebou|ticho|ještě ne|zůstaň tady|děda|babička|živý|kostel|sklep|půda|chodba|zrcadlo|šeptání|sám|spolu|následuj mě|energie",
  ),
  tl: lex(
    "tl",
    "fil-PH",
    "Filipino",
    "Filipino",
    "oo|hindi|kumusta|tulong|dito|doon|ngayon|hintay|tigil|umalis|halika|manatili|tingnan|makinig|magsalita|nanay|tatay|bata|pangalan|sino|ano|saan|bakit|bahay|pinto|liwanag|dilim|anino|tubig|apoy|malamig|mainit|sakit|pag-ibig|takot|kamatayan|buhay|espiritu|multo|kapayapaan|paumanhin|umalis ka|sa likod|ngayon|ngayong gabi|gabi|malapit na|hindi kailanman|lagi|pakiusap|salamat|ako|ikaw|tayo|lalaki|babae|puso|kita|dinig|tandaan|nawawala|panganib|takbo|magtago|buksan|isara|nandito ako|tulungan mo ako|labas|halika dito|mahal kita|pasensya|pangalan ko|malamig|sa likod mo|tahimik|hindi pa|dito ka|lolo|lola|buhay|simbahan|silong|hagdan|salamin|bulong|mag-isa|sama-sama|sundan mo ako|enerhiya",
  ),
  fa: lex(
    "fa",
    "fa-IR",
    "Persian",
    "فارسی",
    "بله|نه|سلام|کمک|اینجا|آنجا|حالا|صبر کن|بایست|برو|بیا|بمان|نگاه کن|گوش کن|حرف بزن|مادر|پدر|کودک|نام|کی|چه|کجا|چرا|خانه|در|نور|تاریکی|سایه|آب|آتش|سرد|گرم|درد|عشق|ترس|مرگ|زندگی|روح|شبح|آرامش|ببخشید|برو بیرون|پشت|امروز|امشب|شب|زود|هرگز|همیشه|لطفا|ممنون|من|تو|ما|مرد|زن|قلب|می‌بینم|می‌شنوم|به یاد داشته باش|گم شده|خطر|بدو|پنهان شو|باز کن|ببند|من اینجام|کمکم کن|بیرون برو|بیا اینجا|دوستت دارم|متاسفم|اسم من|خیلی سرد است|پشت سر تو|ساکت|هنوز نه|همین جا بمان|پدربزرگ|مادربزرگ|زنده|مسجد|زیرزمین|پله|آینه|نجوا|تنها|با هم|دنبال من بیا|انرژی",
  ),
  sw: lex(
    "sw",
    "sw-TZ",
    "Swahili",
    "Kiswahili",
    "ndiyo|hapana|habari|msaada|hapa|pale|sasa|ngoja|simama|nenda|njoo|kaa|tazama|sikiliza|sema|mama|baba|mtoto|jina|nani|nini|wapi|kwa nini|nyumba|mlango|mwanga|giza|kivuli|maji|moto|baridi|joto|maumivu|upendo|hofu|kifo|maisha|roho|mzimu|amani|samahani|ondoka|nyuma|leo|leo usiku|usiku|hivi karibuni|kamwe|daima|tafadhali|asante|mimi|wewe|sisi|mwanamume|mwanamke|moyo|naona|nasikia|kumbuka|potea|hatari|kimbia|jifiche|fungua|funga|niko hapa|nisaidie|toka|njoo hapa|nakupenda|samahani|jina langu|baridi sana|nyuma yako|kimya|bado|kaa hapa|babu|bibi|hai|kanisa|chini|ngazi|kioo|mnong'ono|peke yangu|pamoja|nifuate|nguvu",
  ),
};

export const COUNTRY_TO_LANG: Record<string, string> = {
  GB: "en",
  US: "en",
  AU: "en",
  CA: "en",
  IE: "en",
  NZ: "en",
  ZA: "en",
  JM: "en",
  NG: "en",
  GH: "en",
  UG: "en",
  SG: "en",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  DO: "es",
  BO: "es",
  UY: "es",
  PY: "es",
  CR: "es",
  PA: "es",
  HN: "es",
  NI: "es",
  SV: "es",
  PR: "es",
  GQ: "es",
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  IT: "it",
  SM: "it",
  VA: "it",
  PT: "pt",
  BR: "pt",
  AO: "pt",
  MZ: "pt",
  NL: "nl",
  SR: "nl",
  PL: "pl",
  RU: "ru",
  BY: "ru",
  KZ: "ru",
  UA: "uk",
  IN: "hi",
  LK: "si",
  PK: "ur",
  BD: "bn",
  NP: "ne",
  JP: "ja",
  KR: "ko",
  KP: "ko",
  CN: "zh",
  TW: "zh",
  HK: "zh",
  MO: "zh",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  MA: "ar",
  DZ: "ar",
  IQ: "ar",
  JO: "ar",
  LB: "ar",
  SY: "ar",
  YE: "ar",
  OM: "ar",
  QA: "ar",
  KW: "ar",
  BH: "ar",
  TN: "ar",
  LY: "ar",
  SD: "ar",
  PS: "ar",
  TR: "tr",
  ID: "id",
  MY: "ms",
  BN: "ms",
  TH: "th",
  VN: "vi",
  SE: "sv",
  NO: "no",
  DK: "da",
  FI: "fi",
  GR: "el",
  CY: "el",
  IL: "he",
  RO: "ro",
  MD: "ro",
  HU: "hu",
  CZ: "cs",
  SK: "cs",
  PH: "tl",
  IR: "fa",
  AF: "fa",
  KE: "sw",
  TZ: "sw",
};

export const COUNTRY_HINTS: Record<string, string> = {
  IN: "India defaults to Hindi. Tamil, Bengali, Urdu, and English are in the list.",
  LK: "Sri Lanka defaults to Sinhala. Switch to Tamil if that is the voice you want.",
  CA: "Canada defaults to English. French is in the list.",
  BE: "Belgium defaults to French. Dutch is in the list.",
  CH: "Switzerland defaults to German. French and Italian are in the list.",
  SG: "Singapore defaults to English. Chinese and Malay are in the list.",
  PK: "Pakistan defaults to Urdu. English is in the list.",
  MY: "Malaysia defaults to Malay. English and Chinese are in the list.",
  PH: "The Philippines defaults to Filipino. English is in the list.",
};

const TAG_ALIAS: Record<string, string> = {
  nb: "no",
  nn: "no",
  fil: "tl",
  in: "id",
  iw: "he",
};

export function allLexicons(): Lexicon[] {
  return Object.values(LEXICONS).sort((a, b) => a.name.localeCompare(b.name));
}

export function lexiconByCode(code: string): Lexicon {
  return LEXICONS[code] ?? LEXICONS.en;
}

export function langForCountry(countryCode: string): string | null {
  const key = COUNTRY_TO_LANG[countryCode.toUpperCase()];
  return key && LEXICONS[key] ? key : null;
}

export function lexiconKeyFromTag(tag: string): string {
  const primary = (tag.toLowerCase().split("-")[0] ?? "en");
  const key = TAG_ALIAS[primary] ?? primary;
  return LEXICONS[key] ? key : "en";
}

export function bcp47For(lang: string, countryCode: string): string {
  const cc = countryCode.toUpperCase();
  if (lang === "es") {
    if (cc === "MX" || cc === "US") return "es-MX";
    if (cc === "AR" || cc === "UY" || cc === "CL") return "es-AR";
    return "es-ES";
  }
  if (lang === "pt") return cc === "BR" ? "pt-BR" : "pt-PT";
  if (lang === "en") {
    if (cc === "GB" || cc === "IE") return "en-GB";
    if (cc === "AU" || cc === "NZ") return "en-AU";
    if (cc === "IN") return "en-IN";
    if (cc === "US" || cc === "CA") return "en-US";
    return lexiconByCode("en").bcp47;
  }
  if (lang === "zh") {
    if (cc === "TW") return "zh-TW";
    if (cc === "HK" || cc === "MO") return "zh-HK";
    return "zh-CN";
  }
  if (lang === "fr" && cc === "CA") return "fr-CA";
  return lexiconByCode(lang).bcp47;
}

export type LexiconAnswers = { yes: string; no: string; maybe: string };

export const LEXICON_ANSWERS: Record<string, LexiconAnswers> = {
  en: { yes: "yes", no: "no", maybe: "maybe" },
  es: { yes: "sí", no: "no", maybe: "tal vez" },
  fr: { yes: "oui", no: "non", maybe: "peut-être" },
  de: { yes: "ja", no: "nein", maybe: "vielleicht" },
  it: { yes: "sì", no: "no", maybe: "forse" },
  pt: { yes: "sim", no: "não", maybe: "talvez" },
  nl: { yes: "ja", no: "nee", maybe: "misschien" },
  pl: { yes: "tak", no: "nie", maybe: "może" },
  ru: { yes: "да", no: "нет", maybe: "может быть" },
  uk: { yes: "так", no: "ні", maybe: "можливо" },
  hi: { yes: "हाँ", no: "नहीं", maybe: "शायद" },
  ta: { yes: "ஆம்", no: "இல்லை", maybe: "இருக்கலாம்" },
  bn: { yes: "হ্যাঁ", no: "না", maybe: "হয়তো" },
  ur: { yes: "ہاں", no: "نہیں", maybe: "شاید" },
  si: { yes: "ඔව්", no: "නැහැ", maybe: "වෙන්න පුළුවන්" },
  ne: { yes: "हो", no: "होइन", maybe: "हुन सक्छ" },
  ja: { yes: "はい", no: "いいえ", maybe: "たぶん" },
  ko: { yes: "네", no: "아니요", maybe: "아마도" },
  zh: { yes: "是", no: "不", maybe: "也许" },
  ar: { yes: "نعم", no: "لا", maybe: "ربما" },
  tr: { yes: "evet", no: "hayır", maybe: "belki" },
  id: { yes: "ya", no: "tidak", maybe: "mungkin" },
  ms: { yes: "ya", no: "tidak", maybe: "mungkin" },
  th: { yes: "ใช่", no: "ไม่", maybe: "บางที" },
  vi: { yes: "có", no: "không", maybe: "có lẽ" },
  sv: { yes: "ja", no: "nej", maybe: "kanske" },
  no: { yes: "ja", no: "nei", maybe: "kanskje" },
  da: { yes: "ja", no: "nej", maybe: "måske" },
  fi: { yes: "kyllä", no: "ei", maybe: "ehkä" },
  el: { yes: "ναι", no: "όχι", maybe: "ίσως" },
  he: { yes: "כן", no: "לא", maybe: "אולי" },
  ro: { yes: "da", no: "nu", maybe: "poate" },
  hu: { yes: "igen", no: "nem", maybe: "talán" },
  cs: { yes: "ano", no: "ne", maybe: "možná" },
  tl: { yes: "oo", no: "hindi", maybe: "siguro" },
  fa: { yes: "بله", no: "نه", maybe: "شاید" },
  sw: { yes: "ndiyo", no: "hapana", maybe: "labda" },
};

export function lexiconAnswers(code: string): LexiconAnswers {
  return LEXICON_ANSWERS[code] ?? LEXICON_ANSWERS.en;
}

for (const extras of [EXTRA_WORDS, DEVICE_WORDS]) {
  for (const [code, extra] of Object.entries(extras)) {
    const bank = LEXICONS[code];
    if (!bank || !extra?.length) continue;
    const seen = new Set(bank.words.map((word) => word.toLocaleLowerCase()));
    for (const raw of extra) {
      const word = raw.trim();
      if (!word) continue;
      const key = word.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      bank.words.push(word);
    }
  }
}
