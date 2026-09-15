
/**
 * GOOGLE APPS SCRIPT - VERSÃO COM AUTO-EXPANSÃO DE COLUNAS
 * Wellington Rodovalho - Web Check-in
 */

const EMAIL_DESTINATARIO = "wellington.rodovalho@gmail.com";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); 

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    
    var rawData = "";
    if (e.postData && e.postData.contents) {
      rawData = e.postData.contents;
    } else if (e.parameter && e.parameter.dadosJSON) {
      rawData = e.parameter.dadosJSON;
    } else {
      rawData = JSON.stringify(e.parameter);
    }
    
    var data;
    try {
      data = JSON.parse(rawData);
    } catch(err) {
      data = JSON.parse(decodeURIComponent(rawData));
    }

    logDebug("Recebido cadastro de: " + (data["Hospede_Titular"] || data["Nome Titular"] || "Hóspede"));

    // 1. Gerenciar Pasta de Arquivos
    var folderName = "Arquivos_Checkin";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    // 2. Gerenciar Cabeçalhos (Auto-Expansão)
    // Pega os cabeçalhos atuais da linha 1
    var currentHeaders = sheet.getLastColumn() > 0 
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] 
      : [];
    
    var payloadKeys = Object.keys(data).filter(function(key) {
      return key !== "Destinatario_Email" && key !== "Assunto_Email" && key !== "Corpo_Email" && key !== "PDF_Nome" && key !== "Guest_Email" && key !== "Guest_Name" && key !== "Property_Name" && key !== "Welcome_Link";
    });
    
    // Identifica chaves no payload que ainda não são colunas na planilha
    var newKeys = payloadKeys.filter(function(key) {
      return currentHeaders.indexOf(key) === -1;
    });

    // Se houver campos novos, adiciona como novas colunas
    if (newKeys.length > 0) {
      var nextCol = currentHeaders.length + 1;
      sheet.getRange(1, nextCol, 1, newKeys.length).setValues([newKeys]);
      // Atualiza a lista de cabeçalhos local para mapear a linha corretamente
      currentHeaders = currentHeaders.concat(newKeys);
    }

    var attachments = [];
    var fileUrls = {};

    // 1. Processar todos os campos Base64 do payload primeiro (substitui o base64 pelo link do Drive)
    Object.keys(data).forEach(function(key) {
      var val = data[key];
      if (typeof val === 'string' && val.indexOf('data:') === 0) {
        try {
          var parts = val.split(',');
          var header = parts[0];
          var contentType = header.split(':')[1].split(';')[0];
          var base64Data = parts[1];
          
          var extension = ".jpg";
          if (contentType === "application/pdf") {
            extension = ".pdf";
          } else if (contentType === "image/png") {
            extension = ".png";
          }
          
          var fileName = key.replace(/[^a-z0-9]/gi, '_') + "_" + new Date().getTime() + extension;
          var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, fileName);
          
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          attachments.push(blob);
          fileUrls[key] = file.getUrl();
          data[key] = file.getUrl(); // Substitui o base64 pelo link do Google Drive para não poluir
        } catch(e) { 
          logDebug("Erro ao processar arquivo " + key + ": " + e.toString());
          data[key] = "Erro no Arquivo"; 
        }
      }
    });

    // 3. Mapear dados para as colunas (ignora colunas de controle do e-mail para não poluir a planilha)
    var row = currentHeaders.map(function(h) {
      if (h === "Destinatario_Email" || h === "Assunto_Email" || h === "Corpo_Email" || h === "PDF_Nome" || h === "Guest_Email" || h === "Guest_Name" || h === "Property_Name" || h === "Welcome_Link") {
        return "";
      }
      return data[h] || "";
    });

    // Adiciona a linha de dados
    sheet.appendRow(row);
    
    // Constrói e-mail limpo somente com dados preenchidos
    var emailBody = buildCleanEmailBody(data, fileUrls);
    
    // 4. E-mail de Notificação
    try {
      var recipient = data.Destinatario_Email || EMAIL_DESTINATARIO;
      var subject = data.Assunto_Email || ("CHECK-IN ATUALIZADO: " + (data["Hospede_Titular"] || data["Nome Titular"] || "Novo Hóspede"));
      
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        body: emailBody,
        attachments: attachments
      });
    } catch(e) {
      logDebug("Erro ao enviar email: " + e.toString());
    }

    // 5. E-mail de Boas-vindas para o Hóspede (com o link do imóvel)
    try {
      var guestEmail = data["Guest_Email"] || data["Email_Titular"] || data["E-mail"] || data["Email Titular"] || data["Email"];
      var guestName = data["Guest_Name"] || data["Hospede_Titular"] || data["Nome Titular"] || "Hóspede";
      var propertyName = data["Property_Name"] || data["Imovel_Nome"] || data["Imóvel"] || "Imóvel";
      var welcomeLink = data["Welcome_Link"] || data["Link_Boas_Vindas"];
      
      logDebug("Tentando enviar e-mail de boas-vindas: Email=" + guestEmail + ", Imóvel=" + propertyName + ", Link=" + welcomeLink);
      
      if (guestEmail && welcomeLink && welcomeLink.indexOf("http") === 0) {
        var guestSubject = "Guia de Boas-Vindas - " + propertyName + " | " + guestName + " ✨";
        
        var guestBody = "Olá, " + guestName + ", tudo bem?\n\n" +
          "Estou te enviando nosso Guia Digital de Boas-Vindas do " + propertyName + ". \n" +
          "Nele você encontra todas as informações necessárias para uma excelente estadia conosco. ✨\n\n" +
          "🔗 Clique no link: \n" +
          welcomeLink + "\n\n" +
          "🕙 Horários\n" +
          "🗺️ Locais importantes\n" +
          "🔑 Senha e como abrir a fechadura\n" +
          "🧑‍🏫 Instruções de uso de equipamentos\n" +
          "📤 Checkout\n" +
          "🚨 Emergência\n\n" +
          "⚠️ INFORMAÇÕES IMPORTANTES\n" +
          "🛫 Check-in: A partir das 14h.\n" +
          "🛬 Checkout: Até às 11h.\n\n" +
          "Tenha uma excelente estada cinco estrelas! 🏨\n\n" +
          "Me contate sempre que precisar... 📱 62 99151-4568\n\n" +
          "Seu anfitrião,\n" +
          "Wellington Rodovalho";
          
        MailApp.sendEmail({
          to: guestEmail.trim(),
          subject: guestSubject,
          body: guestBody
        });
        logDebug("E-mail de boas-vindas enviado com sucesso para o hóspede: " + guestEmail);
      } else {
        logDebug("E-mail de boas-vindas não enviado. Condições não atendidas: Email válido? " + !!guestEmail + ", Link de boas-vindas válido? " + !!(welcomeLink && welcomeLink.indexOf("http") === 0));
      }
    } catch(e) {
      logDebug("Erro ao enviar e-mail de boas-vindas para o hóspede: " + e.toString());
    }

    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    logDebug("Erro crítico no processamento: " + error.toString());
    return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function logDebug(msg) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName("DEBUG_LOG") || ss.insertSheet("DEBUG_LOG");
    logSheet.appendRow([new Date(), msg]);
  } catch(e) {}
}

function buildCleanEmailBody(data, fileUrls) {
  var lines = [];
  lines.push("Novo cadastro recebido.");
  lines.push("");

  // Helper to check if a value is empty or unanswered/placeholder
  function isCleanValue(val) {
    if (val === null || val === undefined) return false;
    var s = String(val).trim();
    if (s === "" || s.toUpperCase() === "N/A" || s === "-" || s.toUpperCase() === "NENHUM" || s.toUpperCase() === "N/A / N/A" || s.toUpperCase() === "N/A / N/A / N/A") return false;
    return true;
  }

  // Section 1: Dados do Imóvel e Reserva
  lines.push("=== DADOS DO IMÓVEL E RESERVA ===");
  var bookingFields = [
    { key: "Data de Envio", label: "Data de Envio" },
    { key: "Imóvel", label: "Imóvel" },
    { key: "Endereço do Imóvel", label: "Endereço do Imóvel" },
    { key: "Proprietário", label: "Proprietário" },
    { key: "Check-in", label: "Check-in" },
    { key: "Check-out", label: "Check-out" },
    { key: "Hóspedes", label: "Quantidade de Hóspedes" },
    { key: "Origem da Reserva", label: "Origem da Reserva" },
    { key: "Motivo da Viagem", label: "Motivo da Viagem" },
    { key: "Valor Total", label: "Valor Total" },
    { key: "Caução", label: "Caução" }
  ];
  
  bookingFields.forEach(function(f) {
    var val = data[f.key];
    if (isCleanValue(val)) {
      lines.push("- " + f.label + ": " + val);
    }
  });
  lines.push("");

  // Section 2: Dados do Titular
  lines.push("=== TITULAR ===");
  var mainGuestFields = [
    { key: "Nome Titular", label: "Nome" },
    { key: "CPF Titular", label: "CPF" },
    { key: "RG Titular", label: "RG" },
    { key: "Nacionalidade Titular", label: "Nacionalidade" },
    { key: "Estado Civil Titular", label: "Estado Civil" },
    { key: "Profissão Titular", label: "Profissão" },
    { key: "E-mail", label: "E-mail" },
    { key: "Telefone", label: "Telefone" },
    { key: "Endereço", label: "Endereço Completo" },
    { key: "Logradouro e Número", label: "Logradouro e Número" },
    { key: "Complemento", label: "Complemento" },
    { key: "Bairro", label: "Bairro" },
    { key: "Cidade e Estado", label: "Cidade e Estado" },
    { key: "CEP", label: "CEP" }
  ];
  
  mainGuestFields.forEach(function(f) {
    var val = data[f.key];
    if (isCleanValue(val)) {
      lines.push("- " + f.label + ": " + val);
    }
  });
  lines.push("");

  // Section 3: Contato de Emergência
  var emergencyFields = [
    { key: "Emergência: Nome", label: "Nome" },
    { key: "Emergência: Telefone", label: "Telefone" },
    { key: "Emergência: Parentesco", label: "Parentesco" }
  ];
  
  var hasEmergency = emergencyFields.some(function(f) { return isCleanValue(data[f.key]); });
  if (hasEmergency) {
    lines.push("=== CONTATO DE EMERGÊNCIA ===");
    emergencyFields.forEach(function(f) {
      var val = data[f.key];
      if (isCleanValue(val)) {
        lines.push("- " + f.label + ": " + val);
      }
    });
    lines.push("");
  }

  // Section 4: Veículo (somente se responder Sim ou tiver campos preenchidos)
  var hasVehicleFields = isCleanValue(data["Marca Veículo"]) || isCleanValue(data["Modelo Veículo"]) || isCleanValue(data["Placa Veículo"]) || data["Veículo Próprio?"] === "Sim";
  if (hasVehicleFields) {
    lines.push("=== VEÍCULO ===");
    if (isCleanValue(data["Veículo Próprio?"])) lines.push("- Veículo Próprio?: " + data["Veículo Próprio?"]);
    if (isCleanValue(data["Marca Veículo"])) lines.push("- Marca: " + data["Marca Veículo"]);
    if (isCleanValue(data["Modelo Veículo"])) lines.push("- Modelo: " + data["Modelo Veículo"]);
    if (isCleanValue(data["Cor Veículo"])) lines.push("- Cor: " + data["Cor Veículo"]);
    if (isCleanValue(data["Placa Veículo"])) lines.push("- Placa: " + data["Placa Veículo"]);
    lines.push("");
  }

  // Section 5: Pet (somente se responder Sim ou tiver campos preenchidos)
  var hasPetFields = isCleanValue(data["Pet: Nome"]) || isCleanValue(data["Pet: Raça"]) || data["Possui Pet?"] === "Sim";
  if (hasPetFields) {
    lines.push("=== PET ===");
    if (isCleanValue(data["Possui Pet?"])) lines.push("- Possui Pet?: " + data["Possui Pet?"]);
    if (isCleanValue(data["Pet: Nome"])) lines.push("- Nome: " + data["Pet: Nome"]);
    if (isCleanValue(data["Pet: Raça"])) lines.push("- Raça: " + data["Pet: Raça"]);
    if (isCleanValue(data["Pet: Espécie"])) lines.push("- Espécie: " + data["Pet: Espécie"]);
    if (isCleanValue(data["Pet: Peso"])) lines.push("- Peso: " + data["Pet: Peso"]);
    if (isCleanValue(data["Pet: Idade"])) lines.push("- Idade: " + data["Pet: Idade"]);
    if (isCleanValue(data["Pet: Tamanho"])) lines.push("- Tamanho: " + data["Pet: Tamanho"]);
    lines.push("");
  }

  // Section 6: Acompanhantes (somente os preenchidos)
  var companionLines = [];
  for (var i = 1; i <= 7; i++) {
    var nameKey = "Acompanhante " + i + " Nome Completo";
    if (isCleanValue(data[nameKey])) {
      var details = [];
      details.push("Nome: " + data[nameKey]);
      
      var rgVal = data["Acompanhante " + i + " RG"];
      if (isCleanValue(rgVal)) details.push("RG: " + rgVal);
      
      var cpfVal = data["Acompanhante " + i + " CPF"];
      if (isCleanValue(cpfVal)) details.push("CPF: " + cpfVal);
      
      var emailVal = data["Acompanhante " + i + " Email"];
      if (isCleanValue(emailVal)) details.push("Email: " + emailVal);
      
      var telVal = data["Acompanhante " + i + " Telefone"];
      if (isCleanValue(telVal)) details.push("Telefone: " + telVal);
      
      companionLines.push("- " + details.join(" | "));
    }
  }
  
  if (companionLines.length > 0) {
    lines.push("=== ACOMPANHANTES ===");
    companionLines.forEach(function(l) {
      lines.push(l);
    });
    lines.push("");
  }

  // Section 7: Arquivos Enviados (links do Google Drive)
  var fileLines = [];
  for (var key in fileUrls) {
    if (key !== "Relatório_PDF" && key !== "Relatorio_PDF") { // Remove de vez qualquer referência a Relatório_PDF
      fileLines.push("- " + key + ": [Link: " + fileUrls[key] + "]");
    }
  }
  
  if (fileLines.length > 0) {
    lines.push("=== DOCUMENTOS E IMAGENS (GOOGLE DRIVE) ===");
    fileLines.forEach(function(l) {
      lines.push(l);
    });
    lines.push("");
  }

  return lines.join("\n");
}
