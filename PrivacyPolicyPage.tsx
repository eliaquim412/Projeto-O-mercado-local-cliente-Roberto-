import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-32 pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-2">Política de Privacidade</h1>
            <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A O Mercado Local está comprometida em proteger a privacidade dos seus usuários. 
                  Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos 
                  suas informações pessoais quando você utiliza nossa plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Informações Coletadas</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Coletamos os seguintes tipos de informações:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Dados de cadastro:</strong> nome completo, e-mail, telefone, CPF/CNPJ e endereço.</li>
                  <li><strong>Dados de navegação:</strong> endereço IP, tipo de navegador, páginas visitadas e tempo de acesso.</li>
                  <li><strong>Dados de transação:</strong> histórico de compras, produtos visualizados e interações com vendedores.</li>
                  <li><strong>Dados de localização:</strong> cidade selecionada para exibição de produtos locais.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Uso das Informações</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos suas informações para:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Fornecer e melhorar nossos serviços;</li>
                  <li>Processar transações e enviar notificações relacionadas;</li>
                  <li>Personalizar sua experiência na plataforma;</li>
                  <li>Enviar comunicações de marketing (com seu consentimento);</li>
                  <li>Prevenir fraudes e garantir a segurança da plataforma;</li>
                  <li>Cumprir obrigações legais e regulatórias.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Dados</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Podemos compartilhar suas informações com:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Vendedores:</strong> para processar pedidos e facilitar a comunicação;</li>
                  <li><strong>Prestadores de serviço:</strong> empresas que nos auxiliam em operações (hospedagem, análise de dados);</li>
                  <li><strong>Autoridades:</strong> quando exigido por lei ou ordem judicial.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Segurança dos Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações, 
                  incluindo criptografia de dados, controle de acesso e monitoramento contínuo. No entanto, 
                  nenhum sistema é 100% seguro, e não podemos garantir segurança absoluta.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Seus Direitos</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Acessar seus dados pessoais;</li>
                  <li>Corrigir dados incompletos ou desatualizados;</li>
                  <li>Solicitar a exclusão dos seus dados;</li>
                  <li>Revogar o consentimento para uso dos dados;</li>
                  <li>Solicitar a portabilidade dos dados.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o tráfego 
                  e personalizar conteúdo. Você pode configurar seu navegador para recusar cookies, mas isso 
                  pode afetar algumas funcionalidades da plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Alterações na Política</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças 
                  significativas através do e-mail cadastrado ou aviso na plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Contato</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para dúvidas sobre esta política ou exercer seus direitos, entre em contato conosco pelo 
                  e-mail: <a href="mailto:privacidade@omercadolocal.com.br" className="text-primary hover:underline">privacidade@omercadolocal.com.br</a>
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
