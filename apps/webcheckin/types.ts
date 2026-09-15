
export interface Property {
  id: string;
  name: string;
  address: string;
  ownerName: string;
  ownerCpf: string;
  ownerStatus: string;
  ownerProfession: string;
  petAllowed: boolean;
  capacity: number;
  welcomeLink?: string; // Link de boas-vindas do imóvel
}

export const PROPERTIES: Property[] = [
  {
    id: "7",
    name: "Apto 2 suítes no Bueno, perto do Goiânia Shopping",
    address: "Rua T-47, 173, Ap 410, Bloco C, Setor Bueno, Goiânia-GO, 74210-180",
    ownerName: "Wellington Rodovalho Fonseca",
    ownerCpf: "269.462.701-34",
    ownerStatus: "Casado",
    ownerProfession: "Corretor de Imóveis",
    petAllowed: false,
    capacity: 8,
    welcomeLink: "https://boasvindas-mara.vercel.app/"
  },
  {
    id: "4",
    name: "Casa da vovó, 3 quartos, jardim e 2 vagas de garagem",
    address: "Rua Santa Gertrudes, 26, Setor Coimbra, Goiânia-GO, 74535-420",
    ownerName: "Cristiane Argenta Camelo",
    ownerCpf: "592.216.581-04",
    ownerStatus: "União estável",
    ownerProfession: "Administradora",
    petAllowed: true,
    capacity: 8,
    welcomeLink: "https://casacoimbraguiadigital.vercel.app/"
  },
  {
    id: "8",
    name: "Crystal Place: Flat Moderno c/ Manobrista e Wi-Fi(1701)",
    address: "Avenida Edmundo P. de Abreu, 31, Apartamento 1701, Setor Pedro Ludovico, Goiânia-GO, 74823-030",
    ownerName: "Amanda Curado Peixoto",
    ownerCpf: "269.462.701-34",
    ownerStatus: "Casado",
    ownerProfession: "Corretor de Imóveis",
    petAllowed: true,
    capacity: 8,
    welcomeLink: "https://guiadohospede1701.vercel.app/"
  },
  {
    id: "3",
    name: "Flat no Crystal Place, a 6 min do Flamboyant (1609)",
    address: "Avenida Edmundo P. de Abreu, 31, Apartamento 1609, Setor Pedro Ludovico, Goiânia-GO, 74823-030",
    ownerName: "Wellington Rodovalho Fonseca",
    ownerCpf: "269.462.701-34",
    ownerStatus: "Casado",
    ownerProfession: "Corretor de Imóveis",
    petAllowed: true,
    capacity: 8,
    welcomeLink: "https://boasvindascrystal-wheat.vercel.app/"
  },
  {
    id: "1",
    name: "Resort do Lago 207C 1 quarto(até 5 pessoas)",
    address: "Av. Caminho do Lago, Gleba 10D, Unidade 207 C, Caldas Novas-GO, 75.680-001",
    ownerName: "Rosiani Ipolita Leão",
    ownerCpf: "995.383.856-91",
    ownerStatus: "Solteira",
    ownerProfession: "Pecuarista",
    petAllowed: false,
    capacity: 8,
    welcomeLink: "https://alugagoias.com.br/boas-vindas/resort-lago-207c"
  },
  {
    id: "2",
    name: "Resort do Lago 408D 2 quartos(até 8 pessoas)",
    address: "Av. Caminho do Lago, Gleba 10D, Unidade 408 D, Caldas Novas-GO, 75.680-001",
    ownerName: "Rosiani Ipolita Leão",
    ownerCpf: "995.383.856-91",
    ownerStatus: "Solteira",
    ownerProfession: "Pecuarista",
    petAllowed: false,
    capacity: 8,
    welcomeLink: "https://alugagoias.com.br/boas-vindas/resort-lago-408d"
  },
  {
    id: "5",
    name: "Studio A no Bueno, próximo ao Hospital Neurológico",
    address: "Rua T-45, 61, Ap 101A, Setor Bueno, Goiânia-GO, 74210-160",
    ownerName: "Rosiani Ipolita Leão",
    ownerCpf: "995.383.856-91",
    ownerStatus: "Solteira",
    ownerProfession: "Pecuarista",
    petAllowed: false,
    capacity: 8,
    welcomeLink: "https://boasvindasstudios.vercel.app/"
  },
  {
    id: "6",
    name: "Studio B no Bueno, próximo ao Hospital Neurológico",
    address: "Rua T-45, 61, Ap 101B, Setor Bueno, Goiânia-GO, 74210-160",
    ownerName: "Rosiani Ipolita Leão",
    ownerCpf: "995.383.856-91",
    ownerStatus: "Solteira",
    ownerProfession: "Pecuarista",
    petAllowed: false,
    capacity: 8,
    welcomeLink: "https://boasvindasstudios.vercel.app/"
  },
  {
    id: "9",
    name: "Flat no Sun Square Praça do Sol Setor Oeste",
    address: "Rua 9, 244, Flat 1208A, Sun Square, Setor Oeste, Goiânia-GO, 74110-100",
    ownerName: "LEANDRO CARVALHAL FERREIRA",
    ownerCpf: "",
    ownerStatus: "",
    ownerProfession: "",
    petAllowed: false,
    capacity: 4
  }
].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

export interface PetData {
  hasPet: boolean;
  name?: string;
  breed?: string;
  weight?: string;
  age?: string;
  species?: string;
  size?: string;
  vaccineFile?: string; // Base64
}

export interface Companion {
  id: string;
  name: string;
  rg: string;
  cpf: string;
  email: string;
  phone: string;
  documentNumber: string;
  documentFile?: string; // Base64
}

export interface ReservationData {
  startDate: string;
  endDate: string;
  guestCount: number;
  reasonForVisit: string;
  hasVehicle: boolean;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehiclePlate?: string;
  propertyId: string;
  totalValue: number;
  securityDepositValue: number;
  hasSecurityDeposit: boolean;
  bookingSource: string;
  observations?: string;
}

export interface MainGuest {
  fullName: string;
  cpf: string;
  rg: string;
  nationality: string;
  email: string;
  phone: string;
  address: string;
  addressStreet?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCityState?: string;
  addressZipCode?: string;
  maritalStatus: string;
  profession: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  documentFile?: string; // Base64
  selfieFile?: string; // Base64 for LGPD/Identity verification
}

export interface FullFormData {
  reservation: ReservationData;
  pet: PetData;
  mainGuest: MainGuest;
  companions: Companion[];
  propertyDetails?: Property; // Novo campo para envio completo de dados
  contractText?: string;
  lgpdConsent: boolean;
}

export enum FormStep {
  CONSENT = -1,
  RESERVATION = 0,
  MAIN_GUEST = 1,
  PET_INFO = 2,
  COMPANIONS = 3,
  SUCCESS = 4
}
