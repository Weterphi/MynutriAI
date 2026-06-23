const META_ACCESS_TOKEN = "EAAfrCz3QPpMBR3zlOlHvXsmCjv1tXGSAgM4sJyifYR04DFLUczTLcnfxnZCLPPMo0CDCYOHAwExRjB8BZCawnMZBtIaZAQ588egShawFKrSNi49ozTREtJuDdlUmPn4P7LELs4OqI9R6ffVjzLGfOycHpTiP6sFj1ZCXKYYFt0VOnAMu1UhU6Pt70HPdxRDlqwQZDZD";
const META_PHONE_NUMBER_ID = "1174652649069708";

async function run() {
  const cleanPhone = "393282245236"; // Using a dummy number just to see if the API accepts it

  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: "dieta_pronta_pdf",
      language: { code: "it" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                filename: "Piano_Alimentare_MynutriAI.pdf"
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            {
              type: "text",
              parameter_name: "nome_cliente",
              text: "Test"
            }
          ]
        }
      ]
    }
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Risposta Meta:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}

run();
