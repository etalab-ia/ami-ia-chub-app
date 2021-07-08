# CHU Bordeaux : Application Frontend de visualisation des dossiers patients

## Configuration

Le service frontend fonctionne en tandem avec le service backend.
Il est donc configuré vers l'adresse localhost:8080. Si vous souhaitez changer l'adresse du service backend, celle-ci se trouve dans src/network/index.js (defaultOptions.baseURL, ligne 23).

## Déploiement

Pour plus de simplicité, le service est dockerisé. Vous pouvez le lancer avec

    ./lauch_prod.sh up

qui construit l'image puis la lance à l'adresse http://localhost:80 . Vous pouvez ensuite l'arrêter avec

    ./lauch_prod.sh down

Le service ne stocke aucune donnée, et ne nécessite pas de monter de volume.

Vous pouvez sinon utiliser node + yarn (`yarn start`)

## identification

L'identification actuelle permet d'utiliser login/mdp par défaut ("luser"/"password") ou LDAP.

Pour savoir comment (re)configurer l'identification, réferez vous au readme de l'application backend.

## Organisation du code

- **src/views/Dashboard/index.js** : page principale
- **src/views/Dashboard/components/Timelines** : composants timelines (un par type de document)
- **src/views/Dashboard/components/Modals** : composants modales des timelines (un par timeline, permet le choix des documents dans un aggrégat)
- **src/views/Dashboard/components/Documents** : composants d'affichage de chaque type de données (un par type de document + 2 documents "transverses")

<hr />
Cyril Poulet
cpoulet@starclay.fr
03/05/2021
