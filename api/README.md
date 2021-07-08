# DXCARE-WEBAPP API

Backend du projet dxcare-webapp

Utilise Elasticsearch.

## SETUP

### FHIR

Le serveur FHIR de dxcare-webapp doit être déployé. L'adresse est configurable dans config/default.json

### ElasticSearch

L'api utilise elasticsearch, qui est lancé en même temps via docker-compose. Si vous voulez utiliser une instance externe d'ES, l'adresse est configurable dans config/default.json

### Docker

Docker et docker-compose doivent être installés

### Sécurité

L'appli a un login/mdp par défaut ( 'luser' / 'password' ), et une connection LDAP configurable. Pour configurer la sécurité, se référer à config.md

### dev

Pour lancer en developpement:

    ./launch_dev.sh up

Cette commande lance la stack ELK + l'api dans un docker en mode dev, avec le dossier "src" monté => le service se relancera à chaque modification de code dans un fichier contenu dans source.
Elle lance aussi l'affichage des logs du conteneur dxcare-webapp-api.
Si vous avez besoin d'un debugger, configurez le pour débugger le process dans le docker dxcare-webapp-api, ou tuez le conteneur et lancez le process à côté (vous devez avoir node et yarn installé)

l'api est alors disponible sur http://localhost:8080, elastic sur http://localhost:9200 et kibana sur http://localhost:5601

Pour arreter la stack: ctrl-c pour arreter les logs, puis

    ./launch_dev.sh down

### prod

Pour lancer en prod:

    ./launch_prod.sh up

Cette commande lance elasticsearch + l'api dans un docker en mode prod, (pas de relance du service si modification de code).

l'api est alors disponible sur http://localhost:8080 et elastis sur http://localhost:9200

Pour arreter la stack:

    ./launch_prod.sh down

## Fonctionnement

### Points API

Il y a 3 points API principaux à destination de l'application frontend:

- /fhir/timeline/:id?start_date=13-01-1966&end_date=20-12-2000
  -params: - :id : NIC du patient - start_date/end_date : time range pour les timelines (si pas données, on utilise tout le dossier patient)
  - returns {
    infoPatient = infoPatient || [];
    hospitalisations = hospitalisation || [];
    consultations = consultation || [];
    labResults : labResultsSeries || [],
    clinicalReports : crSeries || [],
    medicationAdministrations : medAdSeries || [],
    qrMedical : qrMedicalSeries || [],
    qrParamedical : qrParamedicalSeries || [],
    pmsis : pmsisSeries || [],
    oldest: startDate.toISOString(),
    recent: endDate.toISOString()
    }

C'est le point API permettant de récupérer les données sous forme de timelines.
Si le dossier patient n'a jamais été ouvert, les données sont récupérées auprès du serveur FHIR, et indexées dans ElasticSearch.
Toutes les requêtes / recherches suivantes se font sur les données indexées dans ES.
Les données d'un patient sont indexées dans un index ES particulier, patient\_${:id})

- /fhir/search/:id?start_date=13-01-1966&end_date=20-12-2000&terms=choc%20surveillance&operator=or&mode=exact&docType=labResults&withRecos=false
  - params:
    - start_date/end_date : time range pour les résultats à renvoyer. Si pas donné, on renvoi tous les résultats de la recherche
    - terms: liste de mots à chercher, séparés par des virgules
    - operator : [and, or] : façon de combiner les termes (défaut: 'and')
    - mode : [exact, approx] : tolérance aux fautes (0 si exact, jusqu'à 2 en approx) (défaut 'exact')
    - docType : si donné, filtre sur le type de données à renvoyer. Doit être dans [
      'labResults',
      'clinicalReports',
      'medicationAdministrations',
      'procedures',
      'pmsis',
      'questionnaireResponses',
      'bacteriology',
      'encounters',
      ]
    - withRecos : si true, on renvoie des recommandations en utilisant neo4j
  - returns {
    labResults : labResultsSeries || [],
    clinicalReports : crSeries || [],
    medicationAdministrations : medAdSeries || [],
    qrMedical : qrMedicalSeries || [],
    qrParamedical : qrParamedicalSeries || [],
    pmsis : pmsisSeries || [],
    oldest: startDate.toISOString(),
    recent: endDate.toISOString(),
    recommandations: {term1: recos, ...}
    };

Point API de recherche dans les données patient. C'est aussi par ce point qu'on peut obtenir les recommandations via la base de connaissance neo4j.

- /fhir/autocomplete/:id/?term=surveil
  -params: - :id : NIC du patient
  - returns: [suggestion_1, suggestion_2, ...] (string[])

Point API permettant d'obtenir des suggestions d'autocompletion basées sur les données du dossier patient

### Indexation ES

Les données relatives à un patient sont indexées dans un index propre, patient\_:nic.

Chaque document de l'index à la forme suivante:

    {
        documentStartDate : date du doc fhir (date de début si encounter)
        documentEndDate : date du doc fhir (date de fin si encounter)
        documentType: type de document FHIR,
        fullDocument: document FHIR sérialisé,
        abstract: document extrait du document original, optimisé pour l'application,
        suggest: liste de termes pour autocompletion,
    }

Les recherches subséquentes se font sur le champs "abstract".

### Recommandations

Les recommandations pour un terme donné se font en 3 temps:

1. identification : On cherche l'ensemble des noeuds du graphe de connaissance dont l'une des propriété contient le terme
2. Pour chaque noeud pouvant être le concept correspondant au terme, on récupère l'ensemble des noeuds reliés par un niveau de relation.
3. Pour chaque noeud-relation, on compte via ES :
   - le nombre de résultat dans le dosier patient si on recherche uniquement le noeud relation
   - le nombre de résultat dans le dossier patient si on recherche conjointement le noeud relation et le terme original.

On renvoie les résultats sous forme d'un arbre de type

    terme recherché => type de concept => match possible => type de relation => noeud-relation
