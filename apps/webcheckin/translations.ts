export type Language = 'pt' | 'en' | 'es';

export interface TranslationDict {
  // General
  wellintonName: string;
  realtorSubtitle: string;
  adminPanel: string;
  back: string;
  continue: string;
  creci: string;
  website: string;
  phoneLabel: string;
  emailLabel: string;
  processing: string;
  errorMessage: string;

  // Step Indicators
  stepReservation: string;
  stepMainGuest: string;
  stepPet: string;
  stepCompanions: string;
  stepFinish: string;

  // Step 1: Consent
  consentTitle: string;
  consentDesc: string;
  consentCheck: string;
  consentButton: string;

  // Step 2: Reservation Data
  resTitle: string;
  resPropertyLabel: string;
  resPropertyPlaceholder: string;
  resPetWarningTitle: string;
  resPetWarningSunSquare: string;
  resPetWarningOthers: string;
  resSourceLabel: string;
  resSourceSub: string;
  resSourceAirbnbMessage: string;
  resSourceOtherMessage: string;
  resReasonLabel: string;
  resReasonSub: string;
  resReasonOptionVacation: string;
  resReasonOptionBusiness: string;
  resReasonOptionHealth: string;
  resReasonOptionFriends: string;
  resReasonOptionEvents: string;
  resReasonOptionOther: string;
  resReasonOtherPlaceholder: string;
  resReasonOtherLabel: string;
  resCheckinLabel: string;
  resCheckoutLabel: string;
  resGuestsLabel: string;
  resGuestsUnit: string;
  resVehicleLabel: string;
  resVehicleSub: string;
  resVehicleBrand: string;
  resVehicleModel: string;
  resVehicleColor: string;
  resVehiclePlate: string;
  resObservationsLabel: string;
  resObservationsPlaceholder: string;

  // Step 3: Main Guest Ident
  guestTitle: string;
  guestFullName: string;
  guestCpf: string;
  guestRg: string;
  guestMaritalStatus: string;
  guestMaritalPlaceholder: string;
  guestMaritalSingle: string;
  guestMaritalMarried: string;
  guestMaritalStable: string;
  guestMaritalDivorced: string;
  guestMaritalWidowed: string;
  guestProfession: string;
  guestEmail: string;
  guestPhone: string;
  guestAddressSection: string;
  guestZipCode: string;
  guestZipSearch: string;
  guestZipError: string;
  guestAddressLine: string;
  guestComplement: string;
  guestDistrict: string;
  guestCityState: string;
  guestDocUpload: string;
  guestSelfieLabel: string;
  guestSelfieHint: string;
  guestEmergencyTitle: string;
  guestEmergencyName: string;
  guestEmergencyPhone: string;
  guestEmergencyRelationship: string;
  guestEmergencyRelationshipSelect: string;
  guestEmergencySpouse: string;
  guestEmergencyChild: string;
  guestEmergencyParents: string;
  guestEmergencySibling: string;
  guestEmergencyFriend: string;
  guestEmergencyOther: string;
  guestNextStepPet: string;
  guestNextStepCompanions: string;

  // Step 4: Pet Info
  petTitle: string;
  petSub: string;
  petOptionNo: string;
  petOptionYes: string;
  petNotAllowed: string;
  petTypeLabel: string;
  petTypeDog: string;
  petTypeCat: string;
  petTypeBird: string;
  petTypeOther: string;
  petNamePlaceholder: string;
  petBreedPlaceholder: string;
  petVaccineLabel: string;

  // Step 5: Companions
  compTitle: string;
  compPendente: string;
  compSub: string;
  compGuestLabel: string;
  compIndividualTitle: string;
  compIndividualText: string;
  compFinishButton: string;
  compErrorAlert: string;

  // Step 6: Success
  successTitle: string;
  successText: string;
  successButton: string;

  // Components specific
  compUploadProcessing: string;
  compUploadPdfAttached: string;
  compUploadImageReady: string;
  compUploadAllowedTypes: string;
  compSelfieLoading: string;
  compSelfieOpen: string;
  compSelfieRetake: string;
  compSelfieCameraPermission: string;
  cameraNoCameraAlert: string;
  cameraOptionA: string;
  cameraOptionADesc: string;
  cameraOptionB: string;
  cameraOptionBDesc: string;
  cameraOptionBButton: string;
}

export const TRANSLATIONS: Record<Language, TranslationDict> = {
  pt: {
    wellintonName: "WELLINGTON RODOVALHO",
    realtorSubtitle: "CORRETOR DE IMÓVEIS",
    adminPanel: "Área do Administrador",
    back: "VOLTAR",
    continue: "CONTINUAR",
    creci: "CRECI: GO 42695",
    website: "www.alugagoias.com.br",
    phoneLabel: "62 99151-4568",
    emailLabel: "contato@alugagoias.com.br",
    processing: "PROCESSANDO...",
    errorMessage: "Erro de conexão.",

    stepReservation: "Reserva",
    stepMainGuest: "Titular",
    stepPet: "Pet",
    stepCompanions: "Ocupantes",
    stepFinish: "Fim",

    consentTitle: "Bem-vindo ao Check-in",
    consentDesc: "Precisamos de algumas informações para a sua hospedagem. Se a sua reserva foi feita via alugagoias.com.br ou Booking.com, geraremos seu contrato de locação temporária. Se foi realizada pelo Airbnb, geraremos sua autorização de entrada.",
    consentCheck: "Autorizo o uso dos meus dados para fins contratuais (LGPD).",
    consentButton: "INICIAR CADASTRO",

    resTitle: "1. Dados da Hospedagem",
    resPropertyLabel: "Imóvel da Reserva",
    resPropertyPlaceholder: "Selecione o imóvel conforme sua reserva",
    resPetWarningTitle: "Aviso Importante sobre Pets",
    resPetWarningSunSquare: "Não aceitamos animais de estimação (pets comuns). Cães de assistência são bem-vindos e têm acesso garantido por lei. Por favor, informe-nos no momento da reserva caso viaje com seu animal de serviço.",
    resPetWarningOthers: "Este imóvel não permite animais de estimação (pets comuns). Caso viaje com cão de assistência (animal de serviço), o acesso é garantido por lei; por favor, informe-nos.",
    resSourceLabel: "Origem da Reserva",
    resSourceSub: "* Onde você realizou a reserva?",
    resSourceAirbnbMessage: "✨ Como sua reserva foi feita pelo Airbnb, geraremos apenas a sua Autorização de Entrada.",
    resSourceOtherMessage: "✨ Como sua reserva foi feita pelo/a {source}, geraremos o seu Contrato de Locação Temporária.",
    resReasonLabel: "Motivo da Viagem",
    resReasonSub: "* Clique no motivo da sua visita",
    resReasonOptionVacation: "Férias/Lazer",
    resReasonOptionBusiness: "Negócios",
    resReasonOptionHealth: "Saúde",
    resReasonOptionFriends: "Parentes/Amigos",
    resReasonOptionEvents: "Eventos",
    resReasonOptionOther: "Outro",
    resReasonOtherPlaceholder: "Digite o motivo da viagem",
    resReasonOtherLabel: "Especifique o motivo",
    resCheckinLabel: "Entrada (Check-in)",
    resCheckoutLabel: "Saída (Check-out)",
    resGuestsLabel: "Ocupantes",
    resGuestsUnit: "Pessoa(s)",
    resVehicleLabel: "Virão de veículo próprio?",
    resVehicleSub: "* Opcional: Se não souber os dados do carro agora, pode deixar em branco e enviar o formulário normalmente.",
    resVehicleBrand: "Marca (Opcional)",
    resVehicleModel: "Modelo (Opcional)",
    resVehicleColor: "Cor (Opcional)",
    resVehiclePlate: "Placa (Opcional)",
    resObservationsLabel: "Observações (Opcional)",
    resObservationsPlaceholder: "Escreva aqui alguma observação sobre sua estadia (ex: horário previsto de chegada, berço, etc.)",

    guestTitle: "2. Identificação do Titular",
    guestFullName: "NOME COMPLETO",
    guestCpf: "CPF",
    guestRg: "RG",
    guestMaritalStatus: "Estado Civil",
    guestMaritalPlaceholder: "SELECIONE O ESTADO CIVIL",
    guestMaritalSingle: "Solteiro(a)",
    guestMaritalMarried: "Casado(a)",
    guestMaritalStable: "União Estável",
    guestMaritalDivorced: "Divorciado(a)",
    guestMaritalWidowed: "Viúvo(a)",
    guestProfession: "PROFISSÃO",
    guestEmail: "E-MAIL",
    guestPhone: "TELEFONE / WHATSAPP",
    guestAddressSection: "Endereço do Titular",
    guestZipCode: "CEP",
    guestZipSearch: "Buscar CEP",
    guestZipError: "CEP não encontrado ou inválido",
    guestAddressLine: "Logradouro (Rua, Avenida, Praça, etc.) e Número",
    guestComplement: "Complemento",
    guestDistrict: "Bairro",
    guestCityState: "Cidade e Estado",
    guestDocUpload: "Doc. Identidade (Frente)",
    guestSelfieLabel: "Selfie do Titular",
    guestSelfieHint: "* Por favor, tire uma selfie segurando o documento de identidade que será apresentado na recepção (rosto e documento legíveis)",
    guestEmergencyTitle: "Contato de Emergência",
    guestEmergencyName: "NOME DO CONTATO",
    guestEmergencyPhone: "CELULAR / WHATSAPP",
    guestEmergencyRelationship: "Parentesco",
    guestEmergencyRelationshipSelect: "SELECIONE",
    guestEmergencySpouse: "Cônjuge",
    guestEmergencyChild: "Filho(a)",
    guestEmergencyParents: "Pai/Mãe",
    guestEmergencySibling: "Irmão/Irmã",
    guestEmergencyFriend: "Amigo(a)",
    guestEmergencyOther: "Outro",
    guestNextStepPet: "PRÓXIMO: PET",
    guestNextStepCompanions: "PRÓXIMO: OCUPANTES",

    petTitle: "VOCÊ LEVARÁ PET?",
    petSub: "Informação obrigatória para o contrato",
    petOptionNo: "NÃO LEVAREI",
    petOptionYes: "SIM, LEVAREI",
    petNotAllowed: "PET NÃO PERMITIDO NESTE IMÓVEL",
    petTypeLabel: "Tipo de Pet",
    petTypeDog: "Cão",
    petTypeCat: "Gato",
    petTypeBird: "Aves",
    petTypeOther: "Outros",
    petNamePlaceholder: "NOME DO PET",
    petBreedPlaceholder: "RAÇA",
    petVaccineLabel: "Carteira de Vacinação do Pet",

    compTitle: "3. Acompanhantes",
    compPendente: "Pendente(s)",
    compSub: "Você informou {count} ocupantes no total. Identifique os acompanhantes abaixo:",
    compGuestLabel: "Ocupante",
    compIndividualTitle: "Reserva Individual",
    compIndividualText: "Apenas o Titular",
    compFinishButton: "FINALIZAR CHECK-IN",
    compErrorAlert: "* Preencha os dados de todos os acompanhantes para continuar",

    successTitle: "CADASTRO REALIZADO!",
    successText: "Os dados foram enviados e as imagens estão sendo processadas no Google Drive.",
    successButton: "NOVO CADASTRO",

    compUploadProcessing: "Processando arquivo...",
    compUploadPdfAttached: "PDF Anexado",
    compUploadImageReady: "Imagem Pronta",
    compUploadAllowedTypes: "PDF, JPEG ou PNG",
    compSelfieLoading: "CARREGANDO...",
    compSelfieOpen: "Abrir Câmera",
    compSelfieRetake: "Refazer",
    compSelfieCameraPermission: "Permita o acesso à câmera.",
    cameraNoCameraAlert: "Não detectamos uma câmera no seu dispositivo. Escolha uma das opções abaixo para enviar sua selfie com documento:",
    cameraOptionA: "Opção A: Continuar no Celular via QR Code",
    cameraOptionADesc: "Aponte a câmera do celular para o código QR abaixo para abrir este passo diretamente no seu smartphone:",
    cameraOptionB: "Opção B: Upload de Arquivo",
    cameraOptionBDesc: "Envie uma foto da sua selfie com documento previamente salva no computador:",
    cameraOptionBButton: "Selecionar Imagem de Selfie"
  },
  en: {
    wellintonName: "WELLINGTON RODOVALHO",
    realtorSubtitle: "REAL ESTATE REALTOR",
    adminPanel: "Admin Area",
    back: "BACK",
    continue: "CONTINUE",
    creci: "CRECI: GO 42695",
    website: "www.alugagoias.com.br",
    phoneLabel: "62 99151-4568",
    emailLabel: "contato@alugagoias.com.br",
    processing: "PROCESSING...",
    errorMessage: "Connection error.",

    stepReservation: "Booking",
    stepMainGuest: "Main Guest",
    stepPet: "Pet",
    stepCompanions: "Occupants",
    stepFinish: "End",

    consentTitle: "Welcome to Check-in",
    consentDesc: "We need some details for your stay. If your booking was made via alugagoias.com.br or Booking.com, we will generate your short-term lease agreement. If made via Airbnb, we will generate your entry authorization.",
    consentCheck: "I authorize the use of my data for contractual purposes (LGPD).",
    consentButton: "START CHECK-IN",

    resTitle: "1. Lodging Details",
    resPropertyLabel: "Property of the Booking",
    resPropertyPlaceholder: "Select the property according to your booking",
    resPetWarningTitle: "Important Pet Notice",
    resPetWarningSunSquare: "We do not accept pets (standard pets). Service dogs are welcome and have access guaranteed by law. Please inform us at the time of booking if traveling with your service animal.",
    resPetWarningOthers: "This property does not allow pets (standard pets). If traveling with a service dog, access is guaranteed by law; please inform us.",
    resSourceLabel: "Booking Source",
    resSourceSub: "* Where did you make the booking?",
    resSourceAirbnbMessage: "✨ As your booking was made on Airbnb, we will only generate your Entry Authorization.",
    resSourceOtherMessage: "✨ As your booking was made on {source}, we will generate your Short-term Lease Agreement.",
    resReasonLabel: "Reason for Trip",
    resReasonSub: "* Click on the reason for your visit",
    resReasonOptionVacation: "Vacation/Leisure",
    resReasonOptionBusiness: "Business",
    resReasonOptionHealth: "Health",
    resReasonOptionFriends: "Relatives/Friends",
    resReasonOptionEvents: "Events",
    resReasonOptionOther: "Other",
    resReasonOtherPlaceholder: "Enter the reason for trip",
    resReasonOtherLabel: "Specify the reason",
    resCheckinLabel: "Check-in Date",
    resCheckoutLabel: "Check-out Date",
    resGuestsLabel: "Occupants Count",
    resGuestsUnit: "Occupant(s)",
    resVehicleLabel: "Are you coming with your own vehicle?",
    resVehicleSub: "* Optional: If you don't know the car details now, you can leave it blank and submit normally.",
    resVehicleBrand: "Brand (Optional)",
    resVehicleModel: "Model (Optional)",
    resVehicleColor: "Color (Optional)",
    resVehiclePlate: "Plate (Optional)",
    resObservationsLabel: "Observations (Optional)",
    resObservationsPlaceholder: "Enter any observations about your stay here (e.g. estimated arrival time, crib request, etc.)",

    guestTitle: "2. Main Guest Identification",
    guestFullName: "FULL NAME",
    guestCpf: "CPF (Tax ID) / Passport",
    guestRg: "RG / ID Number",
    guestMaritalStatus: "Marital Status",
    guestMaritalPlaceholder: "SELECT MARITAL STATUS",
    guestMaritalSingle: "Single",
    guestMaritalMarried: "Married",
    guestMaritalStable: "Civil Union",
    guestMaritalDivorced: "Divorced",
    guestMaritalWidowed: "Widowed",
    guestProfession: "OCCUPATION / PROFESSION",
    guestEmail: "E-MAIL",
    guestPhone: "PHONE / WHATSAPP",
    guestAddressSection: "Main Guest Address",
    guestZipCode: "Zip / Postal Code",
    guestZipSearch: "Search",
    guestZipError: "Postal code not found or invalid",
    guestAddressLine: "Street address, number",
    guestComplement: "Complement / Apt / Unit",
    guestDistrict: "District / Neighborhood",
    guestCityState: "City and State / Region",
    guestDocUpload: "Identity Document (Front)",
    guestSelfieLabel: "Main Guest Selfie",
    guestSelfieHint: "* Please take a selfie holding the ID document that will be presented at the reception (both face and document must be legible)",
    guestEmergencyTitle: "Emergency Contact",
    guestEmergencyName: "CONTACT NAME",
    guestEmergencyPhone: "MOBILE / WHATSAPP",
    guestEmergencyRelationship: "Relationship",
    guestEmergencyRelationshipSelect: "SELECT",
    guestEmergencySpouse: "Spouse",
    guestEmergencyChild: "Child",
    guestEmergencyParents: "Parent",
    guestEmergencySibling: "Sibling",
    guestEmergencyFriend: "Friend",
    guestEmergencyOther: "Other",
    guestNextStepPet: "NEXT: PET",
    guestNextStepCompanions: "NEXT: OCCUPANTS",

    petTitle: "WILL YOU BRING A PET?",
    petSub: "Mandatory information for the agreement",
    petOptionNo: "NO PETS",
    petOptionYes: "YES, I'M BRINGING A PET",
    petNotAllowed: "PETS ARE NOT ALLOWED AT THIS PROPERTY",
    petTypeLabel: "Pet Type",
    petTypeDog: "Dog",
    petTypeCat: "Cat",
    petTypeBird: "Bird",
    petTypeOther: "Others",
    petNamePlaceholder: "PET NAME",
    petBreedPlaceholder: "BREED",
    petVaccineLabel: "Pet Vaccination Card",

    compTitle: "3. Companions / Occupants",
    compPendente: "Pending",
    compSub: "You reported {count} occupants in total. Please identify each companion below:",
    compGuestLabel: "Occupant",
    compIndividualTitle: "Individual Booking",
    compIndividualText: "Only the Main Guest",
    compFinishButton: "FINISH CHECK-IN",
    compErrorAlert: "* Fill in all companions' details to proceed",

    successTitle: "CHECK-IN SUBMITTED!",
    successText: "Your details have been submitted and images are being processed in Google Drive.",
    successButton: "NEW REGISTRATION",

    compUploadProcessing: "Processing file...",
    compUploadPdfAttached: "PDF Attached",
    compUploadImageReady: "Image Ready",
    compUploadAllowedTypes: "PDF, JPEG or PNG",
    compSelfieLoading: "LOADING...",
    compSelfieOpen: "Open Camera",
    compSelfieRetake: "Retake",
    compSelfieCameraPermission: "Please allow camera access.",
    cameraNoCameraAlert: "We could not detect a camera on your device. Choose one of the options below to submit your selfie with document:",
    cameraOptionA: "Option A: Continue on Mobile via QR Code",
    cameraOptionADesc: "Point your phone's camera at the QR code below to open this step directly on your smartphone:",
    cameraOptionB: "Option B: File Upload",
    cameraOptionBDesc: "Upload a photo of your selfie with document already saved on your computer:",
    cameraOptionBButton: "Select Selfie Image"
  },
  es: {
    wellintonName: "WELLINGTON RODOVALHO",
    realtorSubtitle: "AGENTE INMOBILIARIO",
    adminPanel: "Área de Administrador",
    back: "VOLVER",
    continue: "CONTINUAR",
    creci: "CRECI: GO 42695",
    website: "www.alugagoias.com.br",
    phoneLabel: "62 99151-4568",
    emailLabel: "contato@alugagoias.com.br",
    processing: "PROCESANDO...",
    errorMessage: "Error de conexión.",

    stepReservation: "Reserva",
    stepMainGuest: "Titular",
    stepPet: "Mascota",
    stepCompanions: "Ocupantes",
    stepFinish: "Fin",

    consentTitle: "Bienvenido al Check-in",
    consentDesc: "Necesitamos algunos datos para su estadía. Si su reserva fue realizada a través de alugagoias.com.br o Booking.com, generaremos su contrato de arrendamiento temporal. Si fue realizada por Airbnb, generaremos su autorización de ingreso.",
    consentCheck: "Autorizo el uso de mis datos con fines contractuales (LGPD).",
    consentButton: "INICIAR REGISTRO",

    resTitle: "1. Datos del Alojamiento",
    resPropertyLabel: "Propiedad de la Reserva",
    resPropertyPlaceholder: "Seleccione la propiedad de su reserva",
    resPetWarningTitle: "Aviso Importante sobre Mascotas",
    resPetWarningSunSquare: "No aceptamos mascotas (mascotas comunes). Los perros de asistencia son bienvenidos y tienen el acceso garantizado por ley. Por favor, infórmenos al hacer la reserva si viaja con su animal de servicio.",
    resPetWarningOthers: "Esta propiedad no admite mascotas (mascotas comunes). Si viaja con un perro de asistencia, el acceso está garantizado por ley; por favor, infórmenos.",
    resSourceLabel: "Origen de la Reserva",
    resSourceSub: "* ¿Dónde realizó la reserva?",
    resSourceAirbnbMessage: "✨ Como su reserva fue por Airbnb, solo generaremos su Autorización de Entrada.",
    resSourceOtherMessage: "✨ Como su reserva fue por {source}, generaremos su Contrato de Arrendamiento Temporal.",
    resReasonLabel: "Motivo del Viaje",
    resReasonSub: "* Haga clic en el motivo de su visita",
    resReasonOptionVacation: "Vacaciones/Ocio",
    resReasonOptionBusiness: "Negocios",
    resReasonOptionHealth: "Salud",
    resReasonOptionFriends: "Parientes/Amigos",
    resReasonOptionEvents: "Eventos",
    resReasonOptionOther: "Otro",
    resReasonOtherPlaceholder: "Escriba el motivo de su viaje",
    resReasonOtherLabel: "Especifique el motivo",
    resCheckinLabel: "Fecha de Entrada (Check-in)",
    resCheckoutLabel: "Fecha de Salida (Check-out)",
    resGuestsLabel: "Ocupantes",
    resGuestsUnit: "Ocupante(s)",
    resVehicleLabel: "¿Vendrán en vehículo propio?",
    resVehicleSub: "* Opcional: Si no sabe los datos del coche ahora, puede dejarlo en blanco y enviar el formulario con normalidad.",
    resVehicleBrand: "Marca (Opcional)",
    resVehicleModel: "Modelo (Opcional)",
    resVehicleColor: "Color (Opcional)",
    resVehiclePlate: "Matrícula (Opcional)",
    resObservationsLabel: "Observaciones (Opcional)",
    resObservationsPlaceholder: "Escriba aquí alguna observación sobre su estadía (por ejemplo, hora prevista de llegada, solicitud de cuna, etc.)",

    guestTitle: "2. Identificación del Titular",
    guestFullName: "NOMBRE COMPLETO",
    guestCpf: "CPF (ID Fiscal) / Pasaporte",
    guestRg: "RG / Documento de Identidad",
    guestMaritalStatus: "Estado Civil",
    guestMaritalPlaceholder: "SELECCIONE EL ESTADO CIVIL",
    guestMaritalSingle: "Soltero(a)",
    guestMaritalMarried: "Casado(a)",
    guestMaritalStable: "Unión Estable",
    guestMaritalDivorced: "Divorciado(a)",
    guestMaritalWidowed: "Viudo(a)",
    guestProfession: "PROFESIÓN / TRABAJO",
    guestEmail: "CORREO ELECTRÓNICO",
    guestPhone: "TELÉFONO / WHATSAPP",
    guestAddressSection: "Dirección del Titular",
    guestZipCode: "Código Postal",
    guestZipSearch: "Buscar",
    guestZipError: "Código postal no encontrado o inválido",
    guestAddressLine: "Dirección (Calle, número)",
    guestComplement: "Complemento / Depto / Piso",
    guestDistrict: "Barrio / Vecindad",
    guestCityState: "Ciudad y Estado / Región",
    guestDocUpload: "Doc. Identidad (Frente)",
    guestSelfieLabel: "Selfie del Titular",
    guestSelfieHint: "* Por favor, tómese una selfie sosteniendo el documento de identidad que presentará en la recepción (rostro y documento legibles)",
    guestEmergencyTitle: "Contacto de Emergencia",
    guestEmergencyName: "NOMBRE DEL CONTACTO",
    guestEmergencyPhone: "CELULAR / WHATSAPP",
    guestEmergencyRelationship: "Parentesco",
    guestEmergencyRelationshipSelect: "SELECCIONE",
    guestEmergencySpouse: "Cónyuge",
    guestEmergencyChild: "Hijo(a)",
    guestEmergencyParents: "Padre/Madre",
    guestEmergencySibling: "Hermano(a)",
    guestEmergencyFriend: "Amigo(a)",
    guestEmergencyOther: "Otro",
    guestNextStepPet: "SIGUIENTE: MASCOTA",
    guestNextStepCompanions: "SIGUIENTE: OCUPANTES",

    petTitle: "¿LLEVARÁ MASCOTA?",
    petSub: "Información obligatoria para el contrato",
    petOptionNo: "NO LLEVARÉ",
    petOptionYes: "SÍ, LLEVARÉ",
    petNotAllowed: "NO SE PERMITEN MASCOTAS EN ESTA PROPIEDAD",
    petTypeLabel: "Tipo de Mascota",
    petTypeDog: "Perro",
    petTypeCat: "Gato",
    petTypeBird: "Aves",
    petTypeOther: "Otros",
    petNamePlaceholder: "NOMBRE DE LA MASCOTA",
    petBreedPlaceholder: "RAZA",
    petVaccineLabel: "Carnet de Vacunación de la Mascota",

    compTitle: "3. Acompañantes",
    compPendente: "Pendiente(s)",
    compSub: "Informó {count} ocupantes en total. Identifique a los acompañantes a continuación:",
    compGuestLabel: "Ocupante",
    compIndividualTitle: "Reserva Individual",
    compIndividualText: "Solo el Titular",
    compFinishButton: "FINALIZAR REGISTRO",
    compErrorAlert: "* Complete los datos de todos los acompañantes para continuar",

    successTitle: "¡REGISTRO REALIZADO!",
    successText: "Los datos han sido enviados y las imágenes se están procesando en Google Drive.",
    successButton: "NUEVO REGISTRO",

    compUploadProcessing: "Procesando archivo...",
    compUploadPdfAttached: "PDF Adjunto",
    compUploadImageReady: "Imagen Lista",
    compUploadAllowedTypes: "PDF, JPEG o PNG",
    compSelfieLoading: "CARGANDO...",
    compSelfieOpen: "Abrir Cámara",
    compSelfieRetake: "Rehacer",
    compSelfieCameraPermission: "Por favor, permita el acceso a la cámara.",
    cameraNoCameraAlert: "No detectamos una cámara en su dispositivo. Elija una de las opciones a continuación para enviar su selfie con documento:",
    cameraOptionA: "Opción A: Continuar en el Celular via Código QR",
    cameraOptionADesc: "Apunte la cámara de su celular al código QR de abajo para abrir este paso directamente en su smartphone:",
    cameraOptionB: "Opción B: Subir Archivo",
    cameraOptionBDesc: "Suba una foto de su selfie con documento previamente guardada en la computadora:",
    cameraOptionBButton: "Seleccionar Imagen de Selfie"
  }
};
