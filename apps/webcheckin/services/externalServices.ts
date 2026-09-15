
import { FullFormData, PROPERTIES } from "../types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxYh_OKaU0zVQU-vhInBJCTuXBJrjmLjzkmY4pfu7kQVqSrQyYEAwBNS2AwTz5vWspK/exec";

export const syncPropertyWithCatalog = (data: FullFormData) => {
  const targetId = data.propertyDetails?.id || data.reservation?.propertyId;
  if (targetId) {
    const currentProperty = PROPERTIES.find(p => p.id === targetId);
    if (currentProperty) {
      if (!data.propertyDetails) {
        data.propertyDetails = { ...currentProperty };
      } else {
        data.propertyDetails.address = currentProperty.address;
        data.propertyDetails.name = currentProperty.name;
        data.propertyDetails.ownerName = currentProperty.ownerName;
        data.propertyDetails.welcomeLink = currentProperty.welcomeLink;
        data.propertyDetails.petAllowed = currentProperty.petAllowed;
      }
      if (data.reservation) {
        data.reservation.propertyId = currentProperty.id;
      }
    }
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

const formatDateToDMY = (dateStr: string): string => {
  if (!dateStr) return "N/A";
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10).toString();
      const day = parseInt(parts[2], 10).toString();
      return `${day}/${month}/${year}`;
    }
  }
  return dateStr;
};

const isFemaleOwner = (name: string): boolean => {
  const upper = (name || "").toUpperCase();
  return upper.includes("ROSIANI") || upper.includes("AMANDA") || upper.includes("CRISTIANE") || upper.includes("MARIA") || upper.includes("ANA") || upper.includes("DAISY");
};

const isFemaleGuest = (fullName: string): boolean => {
  if (!fullName) return false;
  const clean = fullName.trim();
  const nameParts = clean.toLowerCase().split(/\s+/);
  const firstName = nameParts[0] || "";

  const femaleExceptions = new Set([
    'daisy', 'kelly', 'sueli', 'suely', 'shirley', 'ivone', 'ivonete', 'simone',
    'monique', 'michelle', 'carol', 'karen', 'ester', 'isabel', 'miriam', 'vivian',
    'rachel', 'ruth', 'abigail', 'nicole', 'iris', 'inês', 'ines', 'beatriz',
    'elis', 'marlis', 'rosani', 'rosiane', 'cleide', 'marileide', 'neide', 'salete',
    'janete', 'odete', 'elieti', 'eliene', 'mirlene', 'marlene', 'solange',
    'eliane', 'sirlene', 'arlete', 'gorete', 'marizete', 'dulce', 'jaqueline'
  ]);

  if (femaleExceptions.has(firstName)) return true;

  const maleExceptionsEndingInA = new Set(['luca', 'lucca', 'jean', 'sasha', 'mustafa', 'george', 'pablo']);
  if (firstName.endsWith('a') && !maleExceptionsEndingInA.has(firstName)) {
    return true;
  }

  return false;
};

const formatGenderMaritalStatus = (status: string, isFemale: boolean): string => {
  if (!status) return isFemale ? "solteira" : "solteiro";
  const lower = status.toLowerCase().trim();
  if (lower.includes("solteir")) return isFemale ? "solteira" : "solteiro";
  if (lower.includes("casad")) return isFemale ? "casada" : "casado";
  if (lower.includes("divorciad")) return isFemale ? "divorciada" : "divorciado";
  if (lower.includes("viuv") || lower.includes("viúv")) return isFemale ? "viúva" : "viúvo";
  if (lower.includes("união") || lower.includes("uniao")) return "em união estável";
  return status;
};

const formatGenderNationality = (nat: string, isFemale: boolean): string => {
  if (!nat) return isFemale ? "brasileira" : "brasileiro";
  const lower = nat.toLowerCase().trim();
  if (lower.includes("brasil") || lower.includes("brazil")) return isFemale ? "brasileira" : "brasileiro";
  if (lower.includes("argentin")) return isFemale ? "argentina" : "argentino";
  if (lower.includes("portugu")) return isFemale ? "portuguesa" : "português";
  if (lower.includes("italian")) return isFemale ? "italiana" : "italiano";
  if (lower.includes("espanh") || lower.includes("spanish")) return isFemale ? "espanhola" : "espanhol";
  if (lower.endsWith("o") && isFemale) return lower.slice(0, -1) + "a";
  return nat;
};

const formatGenderProfession = (prof: string, isFemale: boolean): string => {
  if (!prof) return isFemale ? "Autônoma" : "Autônomo";
  const clean = prof.trim();
  const lower = clean.toLowerCase();
  
  if (isFemale) {
    if (lower === "vendedor") return "vendedora";
    if (lower === "empresario" || lower === "empresário") return "empresária";
    if (lower === "advogado") return "advogada";
    if (lower === "medico" || lower === "médico") return "médica";
    if (lower === "engenheiro") return "engenheira";
    if (lower === "professor") return "professora";
    if (lower === "autonomo" || lower === "autônomo") return "autônoma";
    if (lower === "aposentado") return "aposentada";
    if (lower === "estudante") return "estudante";
    if (lower.endsWith("or")) return lower + "a";
    if (lower.endsWith("o")) return lower.slice(0, -1) + "a";
    return lower;
  } else {
    if (lower === "vendedora") return "vendedor";
    if (lower === "empresária") return "empresário";
    if (lower === "advogada") return "advogado";
    if (lower === "médica") return "médico";
    if (lower === "engenheira") return "engenheiro";
    if (lower === "professora") return "professor";
    if (lower === "autônoma") return "autônomo";
    if (lower === "aposentada") return "aposentado";
    return lower;
  }
};

export const buildAuthorizationPDFDoc = (data: FullFormData): jsPDF => {
  syncPropertyWithCatalog(data);

  // 1. Preparar o PDF com o template solicitado
  const doc = new jsPDF();
  
  // Cor de fundo do canvas (Bege/Dourado suave e profissional do template)
  doc.setFillColor(245, 242, 235); // #F5F2EB - off-white linho luxuoso e limpo para impressão
  doc.rect(0, 0, 210, 297, 'F');

  // --- 1. CABEÇALHO ---
  // Logo: Aluga Goiás (Árvore estilizada elegante que corresponde à imagem anexa)
  doc.setDrawColor(83, 56, 22); // Marrom escuro sofisticado (#533816)
  doc.setLineWidth(1.4);
  doc.setLineCap('round');
  
  // Tronco (vai até o centro da copa do topo)
  doc.line(16, 29, 16, 14);
  // Galhos simétricos para a esquerda e direita
  doc.line(16, 23, 11, 18);
  doc.line(16, 23, 21, 18);
  
  // Copas das árvores em Amarelo/Dourado vibrante (#F1B712)
  doc.setFillColor(241, 183, 18);
  doc.setDrawColor(241, 183, 18);
  doc.ellipse(10.5, 18, 3.5, 3.5, 'F'); // Copa esquerda
  doc.ellipse(21.5, 18, 3.5, 3.5, 'F'); // Copa direita
  doc.ellipse(16, 13, 4.2, 4.2, 'F');   // Copa topo

  // Texto Logo
  doc.setTextColor(83, 56, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.text("Aluga", 27, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Goiás", 27, 26);

  // Endereço correto do Imóvel Reservado no Cabeçalho Central
  const rawAddress = data.propertyDetails?.address || "Rua T-45, 61, Ap 101B, Setor Bueno, Goiânia-GO";
  const propertyAddress = `Endereço Completo do Imóvel:\n${rawAddress}`;
  
  // Dividir o endereço para caber perfeitamente no espaço sem quebras brutas
  const addressLines = doc.splitTextToSize(propertyAddress, 64);
  let currentHeaderY = 11;
  
  addressLines.forEach((line: string, index: number) => {
    if (index === 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7.5);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(47, 47, 47);
      doc.setFontSize(7);
    }
    doc.text(line, 86, currentHeaderY, { align: "center" });
    currentHeaderY += 3.5;
  });
  
  // Adicionar URL com estilo limpo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(83, 56, 22);
  doc.text("www.alugagoias.com.br", 86, currentHeaderY, { align: "center" });
  currentHeaderY += 3.5;
  
  // Adicionar WhatsApp destacado em negrito (Novo número solicitado)
  doc.setFont("helvetica", "bold");
  doc.setTextColor(47, 47, 47);
  doc.text("WhatsApp: 62 99151 4568", 86, currentHeaderY, { align: "center" });

  // Card Topo Direito: Data da Autorização
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(125, 10, 75, 18, 3, 3, 'F');
  
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DATA DA AUTORIZAÇÃO:", 130, 15);
  
  // Formato dd/m/aaaa solicitado pelo usuário
  const dateObj = new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = dateObj.getMonth() + 1; // Mês sem zero à esquerda (1 a 12)
  const year = dateObj.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  
  doc.setTextColor(47, 47, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(formattedDate, 130, 22);

  // --- 2. FILEIRA DE INFORMAÇÕES (PROPRIETÁRIO, CHECK-IN, EMERGÊNCIA) ---
  const cardY = 32;
  const cardH = 19;

  // Card 1: Proprietário
  const ownerName = (data.propertyDetails?.ownerName || "ROSIANI IPOLITA LEÃO").toUpperCase();
  const ownerLabel = isFemaleOwner(ownerName) ? "PROPRIETÁRIA" : "PROPRIETÁRIO";

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, cardY, 73, cardH, 3, 3, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(ownerLabel, 14, cardY + 5);
  
  doc.setTextColor(47, 47, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8); // Same size as users
  doc.text(ownerName, 14, cardY + 12, { maxWidth: 65 });

  // Card 2: Check-in / Checkout
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(86, cardY, 53, cardH, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("CHECK-IN", 89, cardY + 5);
  doc.text("CHECKOUT", 116, cardY + 5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(47, 47, 47);
  doc.text(formatDateToDMY(data.reservation.startDate), 89, cardY + 12);
  doc.text("-", 111, cardY + 12);
  doc.text(formatDateToDMY(data.reservation.endDate), 115, cardY + 12);

  // Card 3: Contato de Emergência
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(142, cardY, 58, cardH, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("CONTATO DE EMERGÊNCIA", 146, cardY + 5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(47, 47, 47);
  const emerName = (data.mainGuest.emergencyContactName || "Não Informado").toUpperCase();
  const emerPhone = data.mainGuest.emergencyContactPhone || "";
  const emerRel = data.mainGuest.emergencyContactRelationship ? `(${data.mainGuest.emergencyContactRelationship})` : "";
  
  doc.text(emerName, 146, cardY + 10, { maxWidth: 50 });
  doc.setFont("helvetica", "normal");
  doc.text(`${emerPhone} ${emerRel}`, 146, cardY + 14, { maxWidth: 50 });

  // --- 3. TABELA DE USUÁRIOS ---
  const tableY = 55;
  const tableH = 96;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, tableY, 190, tableH, 3, 3, 'F');

  // Título da Tabela
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(120, 120, 120);
  doc.text("USUÁRIOS", 105, tableY + 5, { align: "center" });

  // Linha dourada sob o título
  doc.setDrawColor(241, 183, 18);
  doc.setLineWidth(0.4);
  doc.line(10, tableY + 7, 200, tableY + 7);

  // Cabeçalhos das Colunas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("NOME", 12, tableY + 12);
  doc.text("TELEFONE", 72, tableY + 12);
  doc.text("CPF", 102, tableY + 12);
  doc.text("RG", 132, tableY + 12);
  doc.text("EMAIL", 157, tableY + 12);

  // Linha sob cabeçalhos
  doc.line(10, tableY + 14, 200, tableY + 14);

  // Grid vertical e horizontal
  // Definindo as larguras de colunas: NOME (60), TELEFONE (30), CPF (30), RG (25), EMAIL (45)
  // Total usable width = 190.
  // Desenhar as linhas das colunas verticais
  doc.setDrawColor(230, 215, 190); // Tom de bege/dourado bem suave e sofisticado
  doc.setLineWidth(0.3);
  doc.line(70, tableY + 7, 70, tableY + tableH - 3);   // depois de NOME
  doc.line(100, tableY + 7, 100, tableY + tableH - 3); // depois de TELEFONE
  doc.line(130, tableY + 7, 130, tableY + tableH - 3); // depois de CPF
  doc.line(155, tableY + 7, 155, tableY + tableH - 3); // depois de RG

  // Desenhar linhas das linhas horizontais
  const rowHeight = 8.5;
  const numRows = 9;
  for (let i = 1; i <= numRows; i++) {
    const rowLineY = tableY + 14 + (i * rowHeight);
    if (rowLineY < tableY + tableH) {
      doc.line(10, rowLineY, 200, rowLineY);
    }
  }

  // Preencher os dados dos hóspedes
  const guestsList: Array<{name: string, phone: string, cpf: string, rg: string, email: string}> = [];
  // Titular
  guestsList.push({
    name: (data.mainGuest.fullName || "").toUpperCase(),
    phone: data.mainGuest.phone || "",
    cpf: data.mainGuest.cpf || "",
    rg: data.mainGuest.rg || "",
    email: data.mainGuest.email || ""
  });
  // Acompanhantes
  data.companions.forEach(c => {
    guestsList.push({
      name: (c.name || "").toUpperCase(),
      phone: c.phone || "",
      cpf: c.cpf || "",
      rg: c.rg || "",
      email: c.email || ""
    });
  });

  // Desenhar textos
  doc.setFontSize(8);
  doc.setTextColor(47, 47, 47);
  for (let i = 0; i < numRows; i++) {
    const rowY = tableY + 14 + (i * rowHeight);
    const guest = guestsList[i];
    if (guest) {
      doc.setFont("helvetica", "bold");
      doc.text(guest.name, 12, rowY + 5.5, { maxWidth: 56 });
      doc.setFont("helvetica", "normal");
      doc.text(guest.phone, 72, rowY + 5.5, { maxWidth: 26 });
      doc.text(guest.cpf, 102, rowY + 5.5, { maxWidth: 26 });
      doc.text(guest.rg, 132, rowY + 5.5, { maxWidth: 21 });
      doc.text(guest.email, 157, rowY + 5.5, { maxWidth: 41 });
    }
  }

  // --- 4. SEÇÃO INFERIOR: OBSERVAÇÕES & VEÍCULO ---
  const bottomY = 156;
  const bottomH = 43;

  // Box Observações
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, bottomY, 130, bottomH, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("OBSERVAÇÕES", 14, bottomY + 5.5);
  
  doc.setFontSize(8);
  doc.setTextColor(47, 47, 47);
  
  // Detalhes do imóvel
  doc.setFont("helvetica", "bold");
  doc.text("Imóvel: ", 14, bottomY + 12);
  doc.setFont("helvetica", "normal");
  const propertyName = data.propertyDetails?.name || "N/A";
  doc.text(propertyName, 25, bottomY + 12, { maxWidth: 110 });
  
  // Check-in / Checkout times
  doc.setFont("helvetica", "bold");
  doc.text("Horário de check-in: ", 14, bottomY + 18);
  doc.setFont("helvetica", "normal");
  doc.text("Depois das 14 horas", 42, bottomY + 18);
  
  doc.setFont("helvetica", "bold");
  doc.text("Horário de check-out: ", 14, bottomY + 24);
  doc.setFont("helvetica", "normal");
  doc.text("Até as 11 horas", 43, bottomY + 24);
  
  // Notas e Pet se houver
  doc.setFont("helvetica", "bold");
  doc.text("Observações: ", 14, bottomY + 30);
  doc.setFont("helvetica", "normal");
  
  let obsStr = data.reservation.observations || "";
  if (data.pet.hasPet) {
    obsStr += (obsStr ? " " : "") + `(Possui Pet: ${data.pet.name || "N/A"} - ${data.pet.breed || "N/A"})`;
  }
  doc.text(obsStr || "Nenhuma observação informada.", 34, bottomY + 30, { maxWidth: 100 });

  // Box Veículo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(143, bottomY, 57, bottomH, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("VEÍCULO", 147, bottomY + 5.5);
  
  doc.setFontSize(8);
  doc.setTextColor(47, 47, 47);
  
  if (data.reservation.hasVehicle) {
    doc.setFont("helvetica", "bold");
    doc.text("Marca: ", 147, bottomY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(data.reservation.vehicleBrand || "N/A", 158, bottomY + 12);
    
    doc.setFont("helvetica", "bold");
    doc.text("Modelo: ", 147, bottomY + 18);
    doc.setFont("helvetica", "normal");
    doc.text(data.reservation.vehicleModel || "N/A", 160, bottomY + 18);

    doc.setFont("helvetica", "bold");
    doc.text("Cor: ", 147, bottomY + 24);
    doc.setFont("helvetica", "normal");
    doc.text(data.reservation.vehicleColor || "N/A", 155, bottomY + 24);
    
    doc.setFont("helvetica", "bold");
    doc.text("Placa: ", 147, bottomY + 30);
    doc.setFont("helvetica", "normal");
    doc.text((data.reservation.vehiclePlate || "N/A").toUpperCase(), 158, bottomY + 30);
  } else {
    doc.setFont("helvetica", "normal");
    doc.text("Nenhum veículo registrado para esta estadia.", 147, bottomY + 12, { maxWidth: 49 });
  }

  return doc;
};

export const downloadAuthorizationPDF = (data: FullFormData, customFilename?: string) => {
  const doc = buildAuthorizationPDFDoc(data);
  const cleanName = (data.mainGuest.fullName || "Hospede").replace(/\s+/g, '_');
  const filename = customFilename || `Autorizacao_${cleanName}_SunSquare_1208A.pdf`;
  doc.save(filename);
};

export const saveToGoogleSheets = async (data: FullFormData): Promise<boolean> => {
  if (!GOOGLE_SHEETS_WEBAPP_URL) return false;

  // Garante que o endereço e dados do imóvel estejam atualizados
  syncPropertyWithCatalog(data);

  // 1. Preparar o PDF com o template solicitado
  const doc = buildAuthorizationPDFDoc(data);
  const pdfOutput = doc.output('datauristring');
  const pdfBase64 = pdfOutput.split(',')[1]; // Strip data:application/pdf;base64,

  // 3. Preparar corpo do email formatado para facilitar o Apps Script
  const emailBody = `
RELATÓRIO DE CHECK-IN - ${data.propertyDetails?.name || 'N/A'}
--------------------------------------------------
DADOS DO IMÓVEL:
- Nome: ${data.propertyDetails?.name || 'N/A'}
- Endereço: ${data.propertyDetails?.address || 'N/A'}

RESERVA:
- Check-in: ${formatDateToDMY(data.reservation.startDate)}
- Check-out: ${formatDateToDMY(data.reservation.endDate)}
- Hóspedes: ${data.reservation.guestCount}
- Origem da Reserva: ${data.reservation.bookingSource || 'N/A'}
- Motivo: ${data.reservation.reasonForVisit}
- Observações: ${data.reservation.observations || 'Nenhuma'}
- Valor Total: ${formatCurrency(data.reservation.totalValue)}
- Caução: ${formatCurrency(data.reservation.securityDepositValue || 0)}

TITULAR:
- Nome: ${data.mainGuest.fullName}
- CPF: ${data.mainGuest.cpf}
- RG: ${data.mainGuest.rg}
- Nacionalidade: ${data.mainGuest.nationality}
- Estado Civil: ${data.mainGuest.maritalStatus}
- Profissão: ${data.mainGuest.profession}
- Email: ${data.mainGuest.email}
- Telefone: ${data.mainGuest.phone}
- Endereço: ${data.mainGuest.address}

CONTATO DE EMERGÊNCIA:
- Nome: ${data.mainGuest.emergencyContactName || 'N/A'}
- Telefone: ${data.mainGuest.emergencyContactPhone || 'N/A'}
- Parentesco: ${data.mainGuest.emergencyContactRelationship || 'N/A'}

VEÍCULO:
- Possui: ${data.reservation.hasVehicle ? 'Sim' : 'Não'}
- Marca: ${data.reservation.vehicleBrand || 'N/A'}
- Modelo: ${data.reservation.vehicleModel || 'N/A'}
- Placa: ${data.reservation.vehiclePlate || 'N/A'}

PET:
- Possui: ${data.pet.hasPet ? 'Sim' : 'Não'}
- Nome: ${data.pet.name || 'N/A'}
- Espécie/Raça: ${data.pet.species || 'N/A'} / ${data.pet.breed || 'N/A'}
- Idade/Peso/Tamanho: ${data.pet.age || 'N/A'} / ${data.pet.weight || 'N/A'} / ${data.pet.size || 'N/A'}

ACOMPANHANTES:
${data.companions.length > 0 
  ? data.companions.map((c, i) => `${i+1}. ${c.name} (RG: ${c.rg || '-'}, CPF: ${c.cpf || '-'}, Email: ${c.email || '-'}, Tel: ${c.phone || '-'})`).join('\n')
  : 'Nenhum'}
--------------------------------------------------
`.trim();

  // 4. Preparar Payload para Planilha e Email
  const ownerIsFemale = isFemaleOwner(data.propertyDetails?.ownerName || '');
  const guestIsFemale = isFemaleGuest(data.mainGuest.fullName || '');

  const payload = {
    "Data de Envio": new Date().toLocaleString('pt-BR'),
    "Destinatario_Email": "wellington.rodovalho@gmail.com",
    "Assunto_Email": `Novo Check-in: ${data.mainGuest.fullName} - ${data.propertyDetails?.name}`,
    "Corpo_Email": emailBody,
    "PDF_Nome": `Relatorio_${data.mainGuest.fullName.replace(/\s+/g, '_')}.pdf`,
    "Imóvel": data.propertyDetails?.name || 'N/A',
    "Endereço do Imóvel": data.propertyDetails?.address || 'N/A',
    "Capacidade Máxima": data.propertyDetails?.capacity ? `${data.propertyDetails.capacity}` : '4',

    // Dados do Proprietário (Owner) com Concordância Gramatical
    "Proprietário": data.propertyDetails?.ownerName || 'N/A',
    "CPF do Proprietário": data.propertyDetails?.ownerCpf || 'N/A',
    "Estado Civil Proprietário": formatGenderMaritalStatus(data.propertyDetails?.ownerStatus || '', ownerIsFemale),
    "Profissão Proprietário": formatGenderProfession(data.propertyDetails?.ownerProfession || '', ownerIsFemale),
    "Nacionalidade Proprietário": ownerIsFemale ? 'brasileira' : 'brasileiro',
    "Endereço Proprietário": 'Goiânia-GO',
    "Termo Proprietário": ownerIsFemale ? 'LOCADORA' : 'LOCADOR',
    "Artigo Proprietário": ownerIsFemale ? 'A' : 'O',
    "Artigo Proprietário Minusculo": ownerIsFemale ? 'a' : 'o',
    "Título Proprietário": ownerIsFemale ? 'legítima proprietária' : 'legítimo proprietário',
    "Denominação Proprietário": ownerIsFemale ? 'denominada simplesmente LOCADORA' : 'denominado simplesmente LOCADOR',
    "Portador Proprietário": ownerIsFemale ? 'portadora' : 'portador',
    "Residente Proprietário": ownerIsFemale ? 'residente e domiciliada' : 'residente e domiciliado',
    "Ao Termo Proprietário": ownerIsFemale ? 'à LOCADORA' : 'ao LOCADOR',
    "Do Termo Proprietário": ownerIsFemale ? 'da LOCADORA' : 'do LOCADOR',

    // Reserva
    "Check-in": formatDateToDMY(data.reservation.startDate),
    "Check-out": formatDateToDMY(data.reservation.endDate),
    "Motivo da Viagem": data.reservation.reasonForVisit,
    "Observações": data.reservation.observations || '',
    "Hóspedes": data.reservation.guestCount,
    "Origem da Reserva": data.reservation.bookingSource || 'N/A',
    "Veículo Próprio?": data.reservation.hasVehicle ? 'Sim' : 'Não',
    "Marca Veículo": data.reservation.vehicleBrand || 'N/A',
    "Modelo Veículo": data.reservation.vehicleModel || 'N/A',
    "Cor Veículo": data.reservation.vehicleColor || 'N/A',
    "Placa Veículo": data.reservation.vehiclePlate || 'N/A',
    "Valor Total": formatCurrency(data.reservation.totalValue),
    "Caução": formatCurrency(data.reservation.securityDepositValue || 0),

    // Dados do Titular (Hóspede/Inquilino) com Concordância Gramatical
    "Nome Titular": data.mainGuest.fullName,
    "CPF Titular": data.mainGuest.cpf,
    "RG Titular": data.mainGuest.rg,
    "Nacionalidade Titular": formatGenderNationality(data.mainGuest.nationality, guestIsFemale),
    "Estado Civil Titular": formatGenderMaritalStatus(data.mainGuest.maritalStatus, guestIsFemale),
    "Profissão Titular": formatGenderProfession(data.mainGuest.profession, guestIsFemale),
    "E-mail": data.mainGuest.email,
    "Telefone": data.mainGuest.phone,
    "Endereço": data.mainGuest.address,
    "Termo Titular": guestIsFemale ? 'LOCATÁRIA' : 'LOCATÁRIO',
    "Artigo Titular": guestIsFemale ? 'A' : 'O',
    "Artigo Titular Minusculo": guestIsFemale ? 'a' : 'o',
    "Título Titular": guestIsFemale ? 'LOCATÁRIA' : 'LOCATÁRIO',
    "Denominação Titular": guestIsFemale ? 'denominada simplesmente LOCATÁRIA' : 'denominado simplesmente LOCATÁRIO',
    "Portador Titular": guestIsFemale ? 'portadora' : 'portador',
    "Residente Titular": guestIsFemale ? 'residente e domiciliada' : 'residente e domiciliado',
    "Ao Termo Titular": guestIsFemale ? 'à LOCATÁRIA' : 'ao LOCATÁRIO',
    "Do Termo Titular": guestIsFemale ? 'da LOCATÁRIA' : 'do LOCATÁRIO',
    "Logradouro e Número": data.mainGuest.addressStreet || '',
    "Complemento": data.mainGuest.addressComplement || '',
    "Bairro": data.mainGuest.addressDistrict || '',
    "Cidade e Estado": data.mainGuest.addressCityState || '',
    "CEP": data.mainGuest.addressZipCode || '',
    "Emergência: Nome": data.mainGuest.emergencyContactName || 'N/A',
    "Emergência: Telefone": data.mainGuest.emergencyContactPhone || 'N/A',
    "Emergência: Parentesco": data.mainGuest.emergencyContactRelationship || 'N/A',
    // Colunas individuais para acompanhantes
    "Acompanhante 1 Nome Completo": data.companions[0]?.name || '',
    "Acompanhante 1 RG": data.companions[0]?.rg || '',
    "Acompanhante 1 CPF": data.companions[0]?.cpf || '',
    "Acompanhante 1 Email": data.companions[0]?.email || '',
    "Acompanhante 1 Telefone": data.companions[0]?.phone || '',

    "Acompanhante 2 Nome Completo": data.companions[1]?.name || '',
    "Acompanhante 2 RG": data.companions[1]?.rg || '',
    "Acompanhante 2 CPF": data.companions[1]?.cpf || '',
    "Acompanhante 2 Email": data.companions[1]?.email || '',
    "Acompanhante 2 Telefone": data.companions[1]?.phone || '',

    "Acompanhante 3 Nome Completo": data.companions[2]?.name || '',
    "Acompanhante 3 RG": data.companions[2]?.rg || '',
    "Acompanhante 3 CPF": data.companions[2]?.cpf || '',
    "Acompanhante 3 Email": data.companions[2]?.email || '',
    "Acompanhante 3 Telefone": data.companions[2]?.phone || '',

    "Acompanhante 4 Nome Completo": data.companions[3]?.name || '',
    "Acompanhante 4 RG": data.companions[3]?.rg || '',
    "Acompanhante 4 CPF": data.companions[3]?.cpf || '',
    "Acompanhante 4 Email": data.companions[3]?.email || '',
    "Acompanhante 4 Telefone": data.companions[3]?.phone || '',

    "Acompanhante 5 Nome Completo": data.companions[4]?.name || '',
    "Acompanhante 5 RG": data.companions[4]?.rg || '',
    "Acompanhante 5 CPF": data.companions[4]?.cpf || '',
    "Acompanhante 5 Email": data.companions[4]?.email || '',
    "Acompanhante 5 Telefone": data.companions[4]?.phone || '',

    "Acompanhante 6 Nome Completo": data.companions[5]?.name || '',
    "Acompanhante 6 RG": data.companions[5]?.rg || '',
    "Acompanhante 6 CPF": data.companions[5]?.cpf || '',
    "Acompanhante 6 Email": data.companions[5]?.email || '',
    "Acompanhante 6 Telefone": data.companions[5]?.phone || '',

    "Acompanhante 7 Nome Completo": data.companions[6]?.name || '',
    "Acompanhante 7 RG": data.companions[6]?.rg || '',
    "Acompanhante 7 CPF": data.companions[6]?.cpf || '',
    "Acompanhante 7 Email": data.companions[6]?.email || '',
    "Acompanhante 7 Telefone": data.companions[6]?.phone || '',

    "Acompanhantes_Resumo": data.companions.length > 0 
      ? data.companions.map((c, i) => `${i+1}: ${c.name} (RG: ${c.rg || '-'}, CPF: ${c.cpf || '-'}, Email: ${c.email || '-'}, Tel: ${c.phone || '-'})`).join(' | ')
      : 'Nenhum',
    "Possui Pet?": data.pet.hasPet ? 'Sim' : 'Não',
    "Pet: Nome": data.pet.name || 'N/A',
    "Pet: Raça": data.pet.breed || 'N/A',
    "Pet: Espécie": data.pet.species || 'N/A',
    "Pet: Peso": data.pet.weight || 'N/A',
    "Pet: Idade": data.pet.age || 'N/A',
    "Pet: Tamanho": data.pet.size || 'N/A',
    "Relatório_PDF": pdfOutput,
    "Doc: Frente": data.mainGuest.documentFile || '',
    "Foto: Selfie": data.mainGuest.selfieFile || '',
    "Doc: Vacina Pet": data.pet.vaccineFile || 'N/A',
    "Link_Boas_Vindas": data.propertyDetails?.welcomeLink || '',
    "Guest_Email": data.mainGuest.email,
    "Guest_Name": data.mainGuest.fullName,
    "Property_Name": data.propertyDetails?.name || 'N/A',
    "Welcome_Link": data.propertyDetails?.welcomeLink || ''
  };

  try {
    await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      body: JSON.stringify(payload)
    });
    
    return true;
  } catch (error) {
    console.error("Erro de rede no dispositivo móvel:", error);
    return false;
  }
};
