import { type Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "~/app/_components/LegalPage";
import { t } from "~/i18n/fi";

export const metadata: Metadata = { title: t.legal.terms };

export default function TermsPage() {
  return (
    <LegalPage title={t.legal.terms} kicker="Voimassa 27.9.2026 alkaen">
      <p>
        Kuraattori on Emilia Repon yksityishenkilönä ylläpitämä maksuton
        harrastepalvelu museoiden näyttelyiden löytämiseen ja seuraamiseen.
        Käyttämällä palvelua hyväksyt nämä ehdot.
      </p>

      <h2>Palvelu sellaisenaan</h2>
      <p>
        Palvelu tarjotaan sellaisenaan ja ilman takuita. Palvelu voi olla poissa
        käytöstä, muuttua tai loppua milloin tahansa. Ylläpitäjä ei vastaa
        vahingoista, jotka johtuvat palvelun käytöstä tai siitä, ettei palvelua
        voi käyttää, siltä osin kuin laki sen sallii.
      </p>

      <h2>Näyttelytiedot</h2>
      <p>
        Näyttelyiden ja museoiden tiedot haetaan automaattisesti{" "}
        <a href="https://www.museot.fi/">museot.fi</a>-palvelusta. Ne voivat
        olla virheellisiä tai vanhentuneita. Tarkista aukioloajat ja näyttelyn
        tiedot museolta ennen käyntiä.
      </p>

      <h2>Käyttäjän vastuut</h2>
      <ul>
        <li>Käytä palvelua lain ja hyvän tavan mukaisesti.</li>
        <li>
          Älä kerää palvelun sisältöä automaattisesti (esimerkiksi raapimalla)
          tai kuormita palvelua tarpeettomasti.
        </li>
        <li>Pidä kalenteriosoitteesi omana tietonasi.</li>
      </ul>

      <h2>Tilin päättäminen</h2>
      <p>
        Voit poistaa tilisi milloin tahansa Profiili-sivun Tili-välilehdeltä.
        Ylläpitäjä voi sulkea tilin, jos palvelua käytetään näiden ehtojen
        vastaisesti, tai lopettaa palvelun kokonaan.
      </p>

      <h2>Ehtojen muuttaminen</h2>
      <p>
        Ehtoja voidaan muuttaa. Uudet ehdot julkaistaan tällä sivulla
        päivämäärän kanssa. Palvelun käytön jatkaminen muutoksen jälkeen
        tarkoittaa uusien ehtojen hyväksymistä.
      </p>

      <h2>Sovellettava laki ja yhteystiedot</h2>
      <p>
        Ehtoihin sovelletaan Suomen lakia. Kysymykset:{" "}
        <a href="mailto:emilia@repo.codes">emilia@repo.codes</a>.
        Henkilötietojen käsittelystä kerrotaan{" "}
        <Link href="/privacy">tietosuojaselosteessa</Link>.
      </p>

      <p className="text-muted font-sans text-sm">
        Ehdot on muokattu Automatticin avoimista{" "}
        <a href="https://github.com/Automattic/legalmattic">Legalmattic</a>
        -ehdoista, ja ne ovat saatavilla{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fi">
          CC BY-SA 4.0
        </a>{" "}
        -lisenssillä.
      </p>
    </LegalPage>
  );
}
