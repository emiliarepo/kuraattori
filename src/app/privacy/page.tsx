import { type Metadata } from "next";

import { LegalPage } from "~/app/_components/LegalPage";
import { getI18n } from "~/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.privacyTitle };
}

export default async function PrivacyPage() {
  const { t, locale } = await getI18n();
  return (
    <LegalPage
      lang={locale === "fi" ? undefined : "fi"}
      title={t.legal.privacyTitle}
      kicker="Versio 4 · Päivitetty 27.9.2026"
    >
      <p>
        Tämä seloste kertoo, mitä henkilötietoja Kuraattori käsittelee ja miksi
        (EU:n tietosuoja-asetus, 13 artikla).
      </p>

      <h2>Rekisterinpitäjä</h2>
      <p>
        Emilia Repo (yksityishenkilö),{" "}
        <a href="mailto:hi@emialis.com">hi@emialis.com</a>. Tietosuojaa koskevat
        pyynnöt voi lähettää samaan osoitteeseen.
      </p>

      <h2>Käsiteltävät tiedot</h2>
      <ul>
        <li>
          Google-tilisi nimi, sähköpostiosoite ja profiilikuvan osoite sekä
          Googlen kirjautumisen yhteydessä antamat tunnisteet.
        </li>
        <li>Kirjautumisistunto ja sen voimassaoloaika.</li>
        <li>
          Valitsemasi alueet, aiheiden kiinnostuspainot, seuraamasi museot ja
          käyttöliittymän kieli.
        </li>
        <li>
          Näyttelymerkintäsi (kiinnostaa, käyty, piilotettu), käyntipäivät,
          muistiinpanot ja käyntien arviot (👍/👎).
        </li>
        <li>
          Tallentamasi matkat: paikka, päivämäärät, valitut näyttelyt ja
          museopäivien suunnitelmat.
        </li>
        <li>Henkilökohtaisen kalenteriosoitteesi tunniste.</li>
        <li>
          Jos haet lähellä avoinna olevia museoita: noin 100 metriin pyöristetty
          sijaintisi, vain sen yhden haun ajan.
        </li>
        <li>
          Jos otat muistutukset käyttöön: laitteesi ilmoitustilauksen osoite ja
          salausavaimet sekä tieto siitä, mistä näyttelyistä ja minä päivänä
          sinua on muistutettu.
        </li>
        <li>
          Palvelimen tekniset lokit, joissa voi näkyä esimerkiksi IP-osoite ja
          pyydetty sivu.
        </li>
      </ul>
      <p>Tiedot saadaan sinulta itseltäsi ja Googlelta kirjautuessasi.</p>

      <h2>Käyttötarkoitus ja oikeusperuste</h2>
      <p>
        Tietoja käytetään vain pyytämäsi palvelun tarjoamiseen: kirjautumiseen,
        suositusten ja omien näyttelyiden näyttämiseen, kalenterisyötteeseen
        sekä pyytämiisi muistutuksiin. Oikeusperuste on sopimus eli palvelun
        tarjoaminen sinulle (6 artiklan 1 kohdan b alakohta). Palvelussa ei ole
        analytiikkaa eikä mainoksia, eikä tietoja myydä tai luovuteta muille.
      </p>

      <h2>Käsittelijät ja siirrot EU:n ulkopuolelle</h2>
      <ul>
        <li>
          Cloudflare, Inc. (palvelin, tietokanta ja lokit) käsittelee tietoja
          ylläpitäjän lukuun{" "}
          <a href="https://www.cloudflare.com/cloudflare-customer-dpa/">
            tietojenkäsittelysopimuksensa
          </a>{" "}
          mukaisesti.
        </li>
        <li>
          Google (kirjautuminen) käsittelee Google-tilisi tietoja omien{" "}
          <a href="https://policies.google.com/privacy?hl=fi">
            tietosuojakäytäntöjensä
          </a>{" "}
          mukaisesti.
        </li>
        <li>
          Muistutukset kulkevat selaimesi valmistajan ilmoituspalvelun kautta
          (esimerkiksi Google, Apple tai Mozilla). Palvelu saa vain salatun
          viestin ja laitteesi tilausosoitteen.
        </li>
      </ul>
      <p>
        Cloudflare ja Google ovat yhdysvaltalaisia yrityksiä. Tietoja voidaan
        siirtää Yhdysvaltoihin EU:n ja Yhdysvaltojen välisen tietosuojakehyksen
        (Data Privacy Framework) tai EU:n vakiosopimuslausekkeiden perusteella.
      </p>

      <h2>Sijainti</h2>
      <p>
        Avoinna nyt lähelläsi -sivu kysyy selaimesi sijaintia vain, kun pyydät
        sitä napauttamalla. Selain pyöristää koordinaatit noin 100 metrin
        tarkkuuteen ennen kuin ne lähetetään palvelimelle, ja niitä käytetään
        vain lähellä olevien museoiden hakemiseen. Sijaintia ei tallenneta
        tietokantaan, evästeisiin eikä lokeihin, eikä sitä liitetä tiliisi. Jos
        et anna lupaa sijaintiin, voit valita kaupungin.
      </p>

      <h2>Karttatiedot</h2>
      <p>
        Museoiden sijainnit ovat museot.fi-palvelusta tai niitä on haettu
        museoiden osoitteilla OpenStreetMapin Nominatim-palvelusta tietojen
        tuonnin yhteydessä. Käyttäjien tietoja ei lähetetä Nominatimiin.
        Karttatiedot ©{" "}
        <a href="https://www.openstreetmap.org/copyright">
          OpenStreetMap-tekijät
        </a>
        , ODbL-lisenssi. Reittilinkki avaa Apple Mapsin tai Google Mapsin, jotka
        käsittelevät pyyntöä omien tietosuojakäytäntöjensä mukaisesti.
      </p>

      <h2>Säilytysaika</h2>
      <p>
        Tilin tiedot säilytetään, kunnes poistat tilisi. Ilmoitustilaus poistuu,
        kun poistat muistutukset käytöstä tai ilmoituspalvelu kertoo sen
        vanhentuneen. Kirjautumisistunto vanhenee 30 päivässä. Palvelimen lokit
        poistuvat Cloudflaren lokien säilytysajan mukaan muutamassa päivässä.
      </p>

      <h2>Evästeet</h2>
      <p>
        Palvelu käyttää vain toiminnan kannalta välttämättömiä evästeitä, ei
        seurantaevästeitä. Suojatussa yhteydessä nimien edessä on etuliite{" "}
        <code>__Secure-</code> tai <code>__Host-</code>.
      </p>
      <ul>
        <li>
          <code>authjs.session-token</code>: kirjautumisistunto (30 päivää).
        </li>
        <li>
          <code>authjs.csrf-token</code>: suojaa kirjautumislomaketta (istunnon
          ajan).
        </li>
        <li>
          <code>authjs.callback-url</code>: sivu, jolle palataan kirjautumisen
          jälkeen (istunnon ajan).
        </li>
        <li>
          <code>authjs.pkce.code_verifier</code>: Google-kirjautumisen
          turvatarkistus (15 minuuttia).
        </li>
        <li>
          <code>kuraattori_regions</code>: valitut alueet kirjautumattomalle
          käyttäjälle (1 vuosi).
        </li>
        <li>
          <code>kuraattori_locale</code>: valitsemasi käyttöliittymän kieli (1
          vuosi).
        </li>
        <li>
          <code>kuraattori_onboarded</code>: tieto siitä, että aloitusohjeet on
          käyty läpi (1 vuosi).
        </li>
      </ul>
      <p>
        Lisäksi selain muistaa näyttelyrivien vierityskohdan välilehden
        istuntomuistissa (sessionStorage). Se ei lähde palvelimelle.
      </p>

      <h2>Oikeutesi</h2>
      <p>
        Sinulla on oikeus saada pääsy tietoihisi, oikaista ne, poistaa ne,
        siirtää ne toiseen palveluun ja vastustaa niiden käsittelyä. Voit ladata
        tietosi JSON-tiedostona ja poistaa tilisi kaikkine tietoineen
        Asetukset-sivun Tili-välilehdeltä. Muissa pyynnöissä ota yhteyttä
        sähköpostilla.
      </p>
      <p>
        Voit tehdä valituksen{" "}
        <a href="https://tietosuoja.fi/">tietosuojavaltuutetulle</a>, jos
        katsot, että tietojasi käsitellään lainvastaisesti.
      </p>
    </LegalPage>
  );
}
