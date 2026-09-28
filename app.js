const state = {
  currentUser: null,
  seasons: [],
  activeSeasonId: null,
  activeSeason: null,
  isCreatingSeason: false,
  seasonUnsubscribe: null,
  selectedSection: 'drivers',
  driverEditId: null,
  teamEditId: null,
  trackEditId: null,
  countryEditId: null,
  resultEditId: null
};

const app = {
  init() {
    this.bindStaticEvents();
    this.ensureFirebase();
    this.updateEditability();
    firebase.auth().onAuthStateChanged((user) => {
      state.currentUser = user;
      this.renderAuthState();
      this.updateEditability();
      this.refreshData();
    });
  },

  ensureFirebase() {
    if (!window.firebaseConfig) {
      console.error('Missing firebase-config.js. Add your Firebase config values.');
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  },

  bindStaticEvents() {
    document.querySelectorAll('.nav-link').forEach((button) => {
      button.addEventListener('click', () => {
        this.setSection(button.dataset.section);
      });
    });

    document.getElementById('login-button').addEventListener('click', () => this.openLoginModal());
    document.getElementById('logout-button').addEventListener('click', this.logout.bind(this));
    document.getElementById('close-login-modal').addEventListener('click', () => this.closeLoginModal());
    document.getElementById('login-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.login();
    });
    document.getElementById('forgot-password-button').addEventListener('click', this.forgotPassword.bind(this));
    document.getElementById('save-season-button').addEventListener('click', this.handleSeasonSave.bind(this));
    document.getElementById('create-season-button').addEventListener('click', () => this.prepareNewSeason());
    document.getElementById('rename-season-button').addEventListener('click', () => this.prepareRenameSeason());
    document.getElementById('delete-season-button').addEventListener('click', this.deleteSelectedSeason.bind(this));
    document.getElementById('export-season-button').addEventListener('click', this.exportSeason.bind(this));
    document.getElementById('import-season-button').addEventListener('click', () => {
      document.getElementById('json-import-input').click();
    });
    document.getElementById('json-import-input').addEventListener('change', this.importSeasonFile.bind(this));
    document.getElementById('season-select').addEventListener('change', (event) => {
      if (event.target.value) {
        this.selectSeason(event.target.value);
      }
    });

    document.getElementById('driver-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveDriver();
    });
    document.getElementById('team-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveTeam();
    });
    document.getElementById('track-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveTrack();
    });
    document.getElementById('country-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveCountry();
    });
    document.getElementById('result-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveResult();
    });

    document.getElementById('add-driver-button').addEventListener('click', () => this.resetDriverForm());
    document.getElementById('add-team-button').addEventListener('click', () => this.resetTeamForm());
    document.getElementById('add-track-button').addEventListener('click', () => this.resetTrackForm());
    document.getElementById('add-country-button').addEventListener('click', () => this.resetCountryForm());
    document.getElementById('add-result-button').addEventListener('click', () => this.resetResultForm());

    document.getElementById('cancel-driver-edit').addEventListener('click', () => this.resetDriverForm());
    document.getElementById('cancel-team-edit').addEventListener('click', () => this.resetTeamForm());
    document.getElementById('cancel-track-edit').addEventListener('click', () => this.resetTrackForm());
    document.getElementById('cancel-country-edit').addEventListener('click', () => this.resetCountryForm());
    document.getElementById('cancel-result-edit').addEventListener('click', () => this.resetResultForm());

    document.getElementById('result-event-type').addEventListener('change', () => this.renderResultPositions());
    document.getElementById('result-track').addEventListener('change', () => {
      const trackName = this.getTrackName(document.getElementById('result-track').value);
      if (trackName && !document.getElementById('result-date').value) {
        document.getElementById('result-date').focus();
      }
    });
  },

  refreshData() {
    if (!state.currentUser) {
      state.seasons = [];
      state.activeSeason = null;
      state.activeSeasonId = null;
      state.isCreatingSeason = false;
      this.clearSeasonSubscription();
      this.renderSeasonSelector();
      this.renderAll();
      return;
    }

    const db = firebase.firestore();
    db.collection('seasons').onSnapshot((snapshot) => {
      state.seasons = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      if (!state.activeSeasonId && !state.isCreatingSeason && state.seasons.length) {
        this.selectSeason(state.seasons[0].id);
      } else if (state.activeSeasonId && !state.seasons.some((season) => season.id === state.activeSeasonId)) {
        state.activeSeasonId = null;
        state.activeSeason = null;
      }

      this.renderSeasonSelector();
      this.renderAll();
    });
  },

  clearSeasonSubscription() {
    if (state.seasonUnsubscribe) {
      state.seasonUnsubscribe();
      state.seasonUnsubscribe = null;
    }
  },

  selectSeason(seasonId) {
    if (!seasonId) return;
    state.isCreatingSeason = false;
    state.activeSeasonId = seasonId;
    this.clearSeasonSubscription();

    const seasonRef = firebase.firestore().collection('seasons').doc(seasonId);
    state.seasonUnsubscribe = seasonRef.onSnapshot((doc) => {
      state.activeSeason = doc.exists ? { id: doc.id, ...doc.data() } : null;
      this.renderSeasonSelector();
      this.renderAll();
    });
  },

  renderAuthState() {
    const indicator = document.getElementById('auth-indicator');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    if (state.currentUser) {
      indicator.textContent = `Logged in as ${state.currentUser.email}`;
      loginButton.classList.add('hidden');
      logoutButton.classList.remove('hidden');
    } else {
      indicator.textContent = 'Log in to edit';
      loginButton.classList.remove('hidden');
      logoutButton.classList.add('hidden');
    }

    this.updateEditability();
  },

  updateEditability() {
    const canEdit = Boolean(state.currentUser);
    document.querySelectorAll('[data-editable="true"]').forEach((element) => {
      element.disabled = !canEdit;
      element.style.opacity = canEdit ? '1' : '0.5';
    });

    document.querySelectorAll('[data-editable-form="true"] input, [data-editable-form="true"] select, [data-editable-form="true"] button').forEach((element) => {
      element.disabled = !canEdit;
    });
  },

  setSection(section) {
    state.selectedSection = section;
    document.querySelectorAll('.nav-link').forEach((button) => {
      button.classList.toggle('active', button.dataset.section === section);
    });

    document.querySelectorAll('.panel').forEach((panel) => {
      const isVisible = panel.id === `section-${section}`;
      panel.classList.toggle('hidden', !isVisible);
      panel.classList.toggle('active', isVisible);
    });
  },

  renderSeasonSelector() {
    const select = document.getElementById('season-select');
    const currentId = state.activeSeasonId;
    const options = state.seasons.map((season) => `<option value="${season.id}">${this.escapeHtml(season.name || 'Unnamed season')}</option>`);
    select.innerHTML = '<option value="">Select a season</option>' + options.join('');
    if (currentId && state.seasons.some((season) => season.id === currentId)) {
      select.value = currentId;
    } else if (!state.isCreatingSeason && state.seasons.length) {
      select.value = state.seasons[0].id;
    }

    const seasonNameInput = document.getElementById('season-name');
    const seasonYearInput = document.getElementById('season-year');
    const seasonSimInput = document.getElementById('season-simulation-name');

    if (state.isCreatingSeason) {
      return;
    }

    if (state.activeSeason) {
      seasonNameInput.value = state.activeSeason.name || '';
      seasonYearInput.value = state.activeSeason.year || '';
      seasonSimInput.value = state.activeSeason.simulationName || '';
    } else {
      seasonNameInput.value = '';
      seasonYearInput.value = '';
      seasonSimInput.value = '';
    }
  },

  prepareNewSeason() {
    state.isCreatingSeason = true;
    state.activeSeasonId = null;
    state.activeSeason = null;
    this.clearSeasonSubscription();
    document.getElementById('season-name').value = '';
    document.getElementById('season-year').value = '';
    document.getElementById('season-simulation-name').value = '';
    this.renderSeasonSelector();
    document.getElementById('season-name').focus();
  },

  prepareRenameSeason() {
    if (!state.activeSeason) {
      this.showMessage('Select a season before renaming it.', true);
      return;
    }
    document.getElementById('season-name').focus();
  },

  async handleSeasonSave() {
    if (!this.ensureUserSignedIn()) return;

    const name = document.getElementById('season-name').value.trim();
    const year = document.getElementById('season-year').value.trim();
    const simulationName = document.getElementById('season-simulation-name').value.trim();

    if (!name || !year || !simulationName) {
      this.showMessage('Season name, year, and simulation name are required.', true);
      return;
    }

    const baseSeason = {
      name,
      year: Number(year),
      simulationName,
      country: state.activeSeason ? this.getCountries(state.activeSeason) : [],
      drivers: state.activeSeason ? state.activeSeason.drivers || [] : [],
      teams: state.activeSeason ? state.activeSeason.teams || [] : [],
      tracks: state.activeSeason ? state.activeSeason.tracks || [] : [],
      results: state.activeSeason ? state.activeSeason.results || [] : []
    };

    if (state.activeSeasonId) {
      await firebase.firestore().collection('seasons').doc(state.activeSeasonId).set(baseSeason, { merge: true });
      this.showMessage('Season updated successfully.');
    } else {
      const ref = await firebase.firestore().collection('seasons').add(baseSeason);
      state.isCreatingSeason = false;
      state.activeSeasonId = ref.id;
      this.showMessage('Season created successfully.');
      this.selectSeason(ref.id);
    }
  },

  async deleteSelectedSeason() {
    if (!this.ensureUserSignedIn()) return;
    if (!state.activeSeasonId) {
      this.showMessage('Select a season to delete.', true);
      return;
    }

    const seasonName = state.activeSeason ? state.activeSeason.name : 'this season';
    if (!window.confirm(`Delete ${seasonName}? This cannot be undone.`)) return;

    await firebase.firestore().collection('seasons').doc(state.activeSeasonId).delete();
    state.isCreatingSeason = false;
    state.activeSeasonId = null;
    state.activeSeason = null;
    this.showMessage('Season deleted.');
  },

  renderAll() {
    this.renderFilterOptions();
    this.renderCountries();
    this.renderDrivers();
    this.renderTeams();
    this.renderTracks();
    this.renderResults();
    this.renderOverview();
    this.renderStandings();
  },

  getSeasonData() {
    return state.activeSeason || {
      country: [],
      drivers: [],
      teams: [],
      tracks: [],
      results: []
    };
  },

  getCountries(season = this.getSeasonData()) {
    return season.country || season.countries || [];
  },

  renderFilterOptions() {
    const season = this.getSeasonData();

    const driverNationality = document.getElementById('driver-nationality');
    driverNationality.innerHTML = this.countryOptionsMarkup();
    if (state.driverEditId) {
      const driver = season.drivers.find((entry) => entry.id === state.driverEditId);
      if (driver) driverNationality.value = driver.nationality || '';
    }

    const driverTeam = document.getElementById('driver-team');
    driverTeam.innerHTML = this.teamOptionsMarkup();
    if (state.driverEditId) {
      const driver = season.drivers.find((entry) => entry.id === state.driverEditId);
      if (driver) driverTeam.value = driver.teamId || '';
    }

    const teamCountry = document.getElementById('team-licence-country');
    teamCountry.innerHTML = this.countryOptionsMarkup();
    if (state.teamEditId) {
      const team = season.teams.find((entry) => entry.id === state.teamEditId);
      if (team) teamCountry.value = team.licenceCountryId || '';
    }

    const trackCountry = document.getElementById('track-country');
    trackCountry.innerHTML = this.countryOptionsMarkup();
    if (state.trackEditId) {
      const track = season.tracks.find((entry) => entry.id === state.trackEditId);
      if (track) trackCountry.value = track.countryId || '';
    }

    const resultTrack = document.getElementById('result-track');
    resultTrack.innerHTML = this.trackOptionsMarkup();
    if (state.resultEditId) {
      const result = season.results.find((entry) => entry.id === state.resultEditId);
      if (result) resultTrack.value = result.trackId || '';
    }

    const fastestLapDriver = document.getElementById('result-fastest-lap-driver');
    const fastestLapToggle = document.getElementById('result-fastest-lap-toggle');
    fastestLapDriver.innerHTML = '<option value="">No fastest lap</option>' + this.driverOptionsMarkup();
    if (state.resultEditId) {
      const result = season.results.find((entry) => entry.id === state.resultEditId);
      if (result) {
        fastestLapToggle.checked = Boolean(result.fastestLapAwarded);
        if (result.fastestLapDriverId) fastestLapDriver.value = result.fastestLapDriverId;
      }
    } else {
      fastestLapToggle.checked = false;
    }
  },

  countryOptionsMarkup() {
    const season = this.getSeasonData();
    return this.getCountries(season).map((country) => `
      <option value="${country.id}">${this.escapeHtml(country.name)}</option>
    `).join('') || '<option value="">No countries added</option>';
  },

  teamOptionsMarkup() {
    const season = this.getSeasonData();
    return (season.teams || []).map((team) => `
      <option value="${team.id}">${this.escapeHtml(team.name)}</option>
    `).join('') || '<option value="">No teams added</option>';
  },

  trackOptionsMarkup() {
    const season = this.getSeasonData();
    return (season.tracks || []).map((track) => `
      <option value="${track.id}">${this.escapeHtml(track.name)}</option>
    `).join('') || '<option value="">No tracks added</option>';
  },

  driverOptionsMarkup() {
    const season = this.getSeasonData();
    return (season.drivers || []).map((driver) => `
      <option value="${driver.id}">${this.escapeHtml(`${driver.firstname} ${driver.lastname}`)}</option>
    `).join('') || '<option value="">No drivers added</option>';
  },

  renderCountries() {
    const list = document.getElementById('countries-list');
    const season = this.getSeasonData();
    const countries = this.getCountries(season);

    if (!countries.length) {
      list.innerHTML = '<div class="empty-state">No countries yet. Add the first country to start building the season.</div>';
      return;
    }

    list.innerHTML = countries.map((country) => `
      <div class="item-card">
        <div class="item-meta">
          <div class="item-title">${this.escapeHtml(country.name)}</div>
          <div class="item-subtitle">${this.escapeHtml(country.isoCode || '')} · ${this.escapeHtml(country.flagImageUrl || 'No flag URL')}</div>
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-country-edit="${country.id}">Edit</button>
          <button class="danger-button" type="button" data-country-delete="${country.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-country-edit]').forEach((button) => {
      button.addEventListener('click', () => this.editCountry(button.dataset.countryEdit));
    });
    list.querySelectorAll('[data-country-delete]').forEach((button) => {
      button.addEventListener('click', () => this.deleteCountry(button.dataset.countryDelete));
    });
  },

  renderDrivers() {
    const list = document.getElementById('drivers-list');
    const season = this.getSeasonData();
    const drivers = season.drivers || [];

    if (!drivers.length) {
      list.innerHTML = '<div class="empty-state">No drivers in this season yet.</div>';
      return;
    }

    list.innerHTML = drivers.map((driver) => `
      <div class="item-card">
        <div class="item-meta">
          <div class="item-title">${this.escapeHtml(driver.firstname)} ${this.escapeHtml(driver.lastname)}</div>
          <div class="item-subtitle">${this.getCountryName(driver.nationality)} · ${this.getTeamName(driver.teamId)}</div>
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-driver-edit="${driver.id}">Edit</button>
          <button class="danger-button" type="button" data-driver-delete="${driver.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-driver-edit]').forEach((button) => {
      button.addEventListener('click', () => this.editDriver(button.dataset.driverEdit));
    });
    list.querySelectorAll('[data-driver-delete]').forEach((button) => {
      button.addEventListener('click', () => this.deleteDriver(button.dataset.driverDelete));
    });
  },

  renderTeams() {
    const list = document.getElementById('teams-list');
    const season = this.getSeasonData();
    const teams = season.teams || [];

    if (!teams.length) {
      list.innerHTML = '<div class="empty-state">No teams yet. Add one to start building the grid.</div>';
      return;
    }

    list.innerHTML = teams.map((team) => `
      <div class="item-card">
        <div class="item-meta">
          <div class="item-title">${this.escapeHtml(team.name)}</div>
          <div class="item-subtitle">${this.getCountryName(team.licenceCountryId)} · Engine: ${this.escapeHtml(team.engine || 'N/A')}</div>
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-team-edit="${team.id}">Edit</button>
          <button class="danger-button" type="button" data-team-delete="${team.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-team-edit]').forEach((button) => {
      button.addEventListener('click', () => this.editTeam(button.dataset.teamEdit));
    });
    list.querySelectorAll('[data-team-delete]').forEach((button) => {
      button.addEventListener('click', () => this.deleteTeam(button.dataset.teamDelete));
    });
  },

  renderTracks() {
    const list = document.getElementById('tracks-list');
    const season = this.getSeasonData();
    const tracks = season.tracks || [];

    if (!tracks.length) {
      list.innerHTML = '<div class="empty-state">No tracks in this season yet.</div>';
      return;
    }

    list.innerHTML = tracks.map((track) => `
      <div class="item-card">
        <div class="item-meta">
          <div class="item-title">${this.escapeHtml(track.name)}</div>
          <div class="item-subtitle">${this.getCountryName(track.countryId)}</div>
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-track-edit="${track.id}">Edit</button>
          <button class="danger-button" type="button" data-track-delete="${track.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-track-edit]').forEach((button) => {
      button.addEventListener('click', () => this.editTrack(button.dataset.trackEdit));
    });
    list.querySelectorAll('[data-track-delete]').forEach((button) => {
      button.addEventListener('click', () => this.deleteTrack(button.dataset.trackDelete));
    });
  },

  renderResults() {
    const list = document.getElementById('results-list');
    const season = this.getSeasonData();
    const results = season.results || [];

    if (!results.length) {
      list.innerHTML = '<div class="empty-state">No race results entered yet.</div>';
      return;
    }

    list.innerHTML = results.map((result) => {
      const status = new Date(result.date) > new Date() ? 'Upcoming' : 'Completed';
      const positions = (result.positions || []).map((position) => {
        const dnfTag = position.dnf ? ' DNF' : '';
        const driverName = this.getDriverName(position.driverId);
        return `<span class="pos-pill">P${position.position || '-'} · ${this.escapeHtml(driverName)}${dnfTag}</span>`;
      }).join('');

      return `
        <div class="result-card">
          <div class="result-header">
            <span class="result-badge">${this.escapeHtml(result.eventType)}</span>
            <span class="result-details">${this.escapeHtml(this.getTrackName(result.trackId))} · ${this.escapeHtml(result.date || 'No date')}</span>
          </div>
          <div class="result-details">${status} · Fastest lap: ${this.escapeHtml(this.getDriverName(result.fastestLapDriverId) || 'N/A')}</div>
          <div class="result-positions">${positions || '<span class="pos-pill">No positions entered</span>'}</div>
          <div class="item-actions" style="margin-top: 12px;">
            <button class="secondary-button" type="button" data-result-edit="${result.id}">Edit</button>
            <button class="danger-button" type="button" data-result-delete="${result.id}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-result-edit]').forEach((button) => {
      button.addEventListener('click', () => this.editResult(button.dataset.resultEdit));
    });
    list.querySelectorAll('[data-result-delete]').forEach((button) => {
      button.addEventListener('click', () => this.deleteResult(button.dataset.resultDelete));
    });
  },

  renderOverview() {
    const wrapper = document.getElementById('overview-panel');
    if (wrapper) {
      wrapper.innerHTML = '';
    }
  },

  exportSeason() {
    if (!state.activeSeasonId || !state.activeSeason) {
      this.showMessage('Select a season to export.', true);
      return;
    }

    const payload = {
      id: state.activeSeason.id,
      name: state.activeSeason.name,
      year: state.activeSeason.year,
      simulationName: state.activeSeason.simulationName,
      country: this.getCountries(state.activeSeason),
      drivers: state.activeSeason.drivers || [],
      teams: state.activeSeason.teams || [],
      tracks: state.activeSeason.tracks || [],
      results: state.activeSeason.results || []
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(state.activeSeason.name || 'season').replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.showMessage('Season exported as JSON.');
  },

  async importSeasonFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!this.ensureUserSignedIn()) {
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const seasonName = payload.name || 'Imported season';

      const shouldOverwrite = state.activeSeasonId && window.confirm(`Overwrite the currently selected season (${state.activeSeason ? state.activeSeason.name : 'selected season'}) with ${seasonName}?`);
      const seasonDoc = {
        name: payload.name || 'Imported season',
        year: payload.year || new Date().getFullYear(),
        simulationName: payload.simulationName || seasonName,
        country: payload.country || payload.countries || [],
        drivers: payload.drivers || [],
        teams: payload.teams || [],
        tracks: payload.tracks || [],
        results: payload.results || []
      };

      if (state.activeSeasonId && shouldOverwrite) {
        await this.updateSeasonDocument(seasonDoc);
        this.showMessage('Season overwritten from JSON import.');
      } else {
        const ref = await firebase.firestore().collection('seasons').add(seasonDoc);
        state.activeSeasonId = ref.id;
        this.showMessage('New season created from JSON import.');
        this.selectSeason(ref.id);
      }
    } catch (error) {
      this.showMessage('Unable to import this JSON file.', true);
    } finally {
      event.target.value = '';
    }
  },

  renderStandings() {
    const driverBody = document.getElementById('drivers-standings-body');
    const constructorBody = document.getElementById('constructors-standings-body');
    const season = this.getSeasonData();
    const standings = this.calculateDriverStandings(season);
    const constructors = this.calculateConstructorStandings(season);

    driverBody.innerHTML = standings.map((entry, index) => `
      <tr class="${index === 0 ? 'leader' : ''}">
        <td>${index + 1}</td>
        <td>${this.escapeHtml(entry.driverName)}</td>
        <td>${this.escapeHtml(entry.teamName)}</td>
        <td>${entry.points}</td>
        <td>${entry.wins}</td>
        <td>${entry.podiums}</td>
      </tr>
    `).join('');

    constructorBody.innerHTML = constructors.map((entry, index) => `
      <tr class="${index === 0 ? 'leader' : ''}">
        <td>${index + 1}</td>
        <td>${this.escapeHtml(entry.teamName)}</td>
        <td>${entry.points}</td>
      </tr>
    `).join('');
  },

  calculateDriverStandings(season) {
    const drivers = season.drivers || [];
    const map = new Map();

    drivers.forEach((driver) => {
      map.set(driver.id, {
        driverId: driver.id,
        driverName: `${driver.firstname} ${driver.lastname}`,
        teamName: this.getTeamName(driver.teamId),
        points: 0,
        wins: 0,
        podiums: 0
      });
    });

    (season.results || []).forEach((result) => {
      if (result.eventType !== 'R' && result.eventType !== 'SR') return;

      const pointsMap = result.eventType === 'R'
        ? { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 }
        : { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

      (result.positions || []).forEach((position) => {
        if (!position || !position.driverId || position.dnf) return;
        const entry = map.get(position.driverId);
        if (!entry) return;
        const positionValue = Number(position.position);
        if (Number.isFinite(positionValue) && positionValue > 0) {
          entry.points += pointsMap[positionValue] || 0;
          if (positionValue === 1) entry.wins += 1;
          if (positionValue <= 3) entry.podiums += 1;
        }
      });

      if (result.eventType === 'R' && result.fastestLapDriverId && result.fastestLapAwarded) {
        const entry = map.get(result.fastestLapDriverId);
        if (entry) entry.points += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.podiums - a.podiums;
    });
  },

  calculateConstructorStandings(season) {
    const teams = season.teams || [];
    const totals = new Map();

    teams.forEach((team) => {
      totals.set(team.id, { teamId: team.id, teamName: team.name, points: 0 });
    });

    const driverStandings = this.calculateDriverStandings(season);
    driverStandings.forEach((entry) => {
      const driver = (season.drivers || []).find((item) => item.id === entry.driverId);
      if (!driver) return;
      if (driver.teamId && totals.has(driver.teamId)) {
        totals.get(driver.teamId).points += entry.points;
      }
    });

    return Array.from(totals.values()).sort((a, b) => b.points - a.points);
  },

  getCountryName(countryId) {
    const season = this.getSeasonData();
    const country = this.getCountries(season).find((entry) => entry.id === countryId);
    return country ? country.name : 'Unknown country';
  },

  getTeamName(teamId) {
    const season = this.getSeasonData();
    const team = (season.teams || []).find((entry) => entry.id === teamId);
    return team ? team.name : 'No team';
  },

  getTrackName(trackId) {
    const season = this.getSeasonData();
    const track = (season.tracks || []).find((entry) => entry.id === trackId);
    return track ? track.name : 'Unknown track';
  },

  getDriverName(driverId) {
    const season = this.getSeasonData();
    const driver = (season.drivers || []).find((entry) => entry.id === driverId);
    return driver ? `${driver.firstname} ${driver.lastname}` : 'Unknown driver';
  },

  resetDriverForm() {
    state.driverEditId = null;
    document.getElementById('driver-form').reset();
    document.getElementById('driver-form-title').textContent = 'Add driver';
    document.getElementById('driver-id').value = '';
    this.renderFilterOptions();
  },

  editDriver(driverId) {
    const season = this.getSeasonData();
    const driver = (season.drivers || []).find((entry) => entry.id === driverId);
    if (!driver) return;
    state.driverEditId = driverId;
    document.getElementById('driver-form-title').textContent = 'Edit driver';
    document.getElementById('driver-id').value = driver.id;
    document.getElementById('driver-firstname').value = driver.firstname || '';
    document.getElementById('driver-lastname').value = driver.lastname || '';
    document.getElementById('driver-nationality').value = driver.nationality || '';
    document.getElementById('driver-team').value = driver.teamId || '';
  },

  async saveDriver() {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const firstName = document.getElementById('driver-firstname').value.trim();
    const lastName = document.getElementById('driver-lastname').value.trim();
    const nationality = document.getElementById('driver-nationality').value;
    const teamId = document.getElementById('driver-team').value;

    if (!firstName || !lastName) {
      this.showMessage('Driver first and last name are required.', true);
      return;
    }

    const driver = {
      id: state.driverEditId || this.generateId(),
      firstname: firstName,
      lastname: lastName,
      nationality,
      teamId
    };

    const drivers = [...(season.drivers || [])];
    const index = drivers.findIndex((entry) => entry.id === driver.id);
    if (index >= 0) {
      drivers[index] = driver;
    } else {
      drivers.push(driver);
    }

    await this.updateSeasonDocument({ drivers });
    this.resetDriverForm();
    this.showMessage('Driver saved.');
  },

  async deleteDriver(driverId) {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const driver = (season.drivers || []).find((entry) => entry.id === driverId);
    if (!driver) return;
    if (!window.confirm(`Delete ${driver.firstname} ${driver.lastname}?`)) return;

    const drivers = (season.drivers || []).filter((entry) => entry.id !== driverId);
    await this.updateSeasonDocument({ drivers });
    this.showMessage('Driver deleted.');
  },

  resetTeamForm() {
    state.teamEditId = null;
    document.getElementById('team-form').reset();
    document.getElementById('team-form-title').textContent = 'Add team';
    document.getElementById('team-id').value = '';
    this.renderFilterOptions();
  },

  editTeam(teamId) {
    const season = this.getSeasonData();
    const team = (season.teams || []).find((entry) => entry.id === teamId);
    if (!team) return;
    state.teamEditId = teamId;
    document.getElementById('team-form-title').textContent = 'Edit team';
    document.getElementById('team-id').value = team.id;
    document.getElementById('team-name').value = team.name || '';
    document.getElementById('team-licence-country').value = team.licenceCountryId || '';
    document.getElementById('team-engine').value = team.engine || '';
  },

  async saveTeam() {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const name = document.getElementById('team-name').value.trim();
    const licenceCountryId = document.getElementById('team-licence-country').value;
    const engine = document.getElementById('team-engine').value.trim();
    if (!name || !engine) {
      this.showMessage('Team name and engine supplier are required.', true);
      return;
    }

    const team = {
      id: state.teamEditId || this.generateId(),
      name,
      licenceCountryId,
      engine
    };

    const teams = [...(season.teams || [])];
    const index = teams.findIndex((entry) => entry.id === team.id);
    if (index >= 0) {
      teams[index] = team;
    } else {
      teams.push(team);
    }

    await this.updateSeasonDocument({ teams });
    this.resetTeamForm();
    this.showMessage('Team saved.');
  },

  async deleteTeam(teamId) {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const team = (season.teams || []).find((entry) => entry.id === teamId);
    if (!team) return;
    if (!window.confirm(`Delete ${team.name}?`)) return;

    const teams = (season.teams || []).filter((entry) => entry.id !== teamId);
    await this.updateSeasonDocument({ teams });
    this.showMessage('Team deleted.');
  },

  resetTrackForm() {
    state.trackEditId = null;
    document.getElementById('track-form').reset();
    document.getElementById('track-form-title').textContent = 'Add track';
    document.getElementById('track-id').value = '';
    this.renderFilterOptions();
  },

  editTrack(trackId) {
    const season = this.getSeasonData();
    const track = (season.tracks || []).find((entry) => entry.id === trackId);
    if (!track) return;
    state.trackEditId = trackId;
    document.getElementById('track-form-title').textContent = 'Edit track';
    document.getElementById('track-id').value = track.id;
    document.getElementById('track-name-input').value = track.name || '';
    document.getElementById('track-country').value = track.countryId || '';
  },

  async saveTrack() {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const name = document.getElementById('track-name-input').value.trim();
    const countryId = document.getElementById('track-country').value;
    if (!name) {
      this.showMessage('Track name is required.', true);
      return;
    }

    const track = {
      id: state.trackEditId || this.generateId(),
      name,
      countryId
    };

    const tracks = [...(season.tracks || [])];
    const index = tracks.findIndex((entry) => entry.id === track.id);
    if (index >= 0) {
      tracks[index] = track;
    } else {
      tracks.push(track);
    }

    await this.updateSeasonDocument({ tracks });
    this.resetTrackForm();
    this.showMessage('Track saved.');
  },

  async deleteTrack(trackId) {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const track = (season.tracks || []).find((entry) => entry.id === trackId);
    if (!track) return;
    if (!window.confirm(`Delete ${track.name}?`)) return;

    const tracks = (season.tracks || []).filter((entry) => entry.id !== trackId);
    await this.updateSeasonDocument({ tracks });
    this.showMessage('Track deleted.');
  },

  resetCountryForm() {
    state.countryEditId = null;
    document.getElementById('country-form').reset();
    document.getElementById('country-form-title').textContent = 'Add country';
    document.getElementById('country-id').value = '';
    this.renderFilterOptions();
  },

  editCountry(countryId) {
    const season = this.getSeasonData();
    const country = this.getCountries(season).find((entry) => entry.id === countryId);
    if (!country) return;
    state.countryEditId = countryId;
    document.getElementById('country-form-title').textContent = 'Edit country';
    document.getElementById('country-id').value = country.id;
    document.getElementById('country-name-input').value = country.name || '';
    document.getElementById('country-flag').value = country.flagImageUrl || '';
    document.getElementById('country-iso').value = country.isoCode || '';
  },

  async saveCountry() {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const name = document.getElementById('country-name-input').value.trim();
    const flagImageUrl = document.getElementById('country-flag').value.trim();
    const isoCode = document.getElementById('country-iso').value.trim().toUpperCase();

    if (!name || !flagImageUrl || !isoCode) {
      this.showMessage('Country name, flag URL, and ISO code are required.', true);
      return;
    }

    const country = {
      id: state.countryEditId || this.generateId(),
      name,
      flagImageUrl,
      isoCode
    };

    const countries = [...this.getCountries(season)];
    const index = countries.findIndex((entry) => entry.id === country.id);
    if (index >= 0) {
      countries[index] = country;
    } else {
      countries.push(country);
    }

    await this.updateSeasonDocument({ country: countries });
    this.resetCountryForm();
    this.showMessage('Country saved.');
  },

  async deleteCountry(countryId) {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const country = this.getCountries(season).find((entry) => entry.id === countryId);
    if (!country) return;
    if (!window.confirm(`Delete ${country.name}?`)) return;

    const countries = this.getCountries(season).filter((entry) => entry.id !== countryId);
    await this.updateSeasonDocument({ country: countries });
    this.showMessage('Country deleted.');
  },

  resetResultForm() {
    state.resultEditId = null;
    document.getElementById('result-form').reset();
    document.getElementById('result-form-title').textContent = 'Add race result';
    document.getElementById('result-id').value = '';
    this.renderResultPositions();
  },

  editResult(resultId) {
    const season = this.getSeasonData();
    const result = (season.results || []).find((entry) => entry.id === resultId);
    if (!result) return;

    state.resultEditId = resultId;
    document.getElementById('result-form-title').textContent = 'Edit result';
    document.getElementById('result-id').value = result.id;
    document.getElementById('result-track').value = result.trackId || '';
    document.getElementById('result-date').value = result.date || '';
    document.getElementById('result-event-type').value = result.eventType || 'R';
    document.getElementById('result-fastest-lap-driver').value = result.fastestLapDriverId || '';
    this.renderResultPositions(result);
  },

  renderResultPositions(result = null) {
    const eventType = document.getElementById('result-event-type').value || 'R';
    const season = this.getSeasonData();
    const positionCount = eventType === 'R' ? 10 : eventType === 'SR' ? 8 : 3;
    const resultData = result || (state.resultEditId ? (season.results || []).find((entry) => entry.id === state.resultEditId) : null);
    const fastestLapContainer = document.getElementById('fastest-lap-container');
    const fastestLapDriver = document.getElementById('result-fastest-lap-driver');
    const fastestLapToggle = document.getElementById('result-fastest-lap-toggle');
    fastestLapContainer.classList.toggle('hidden', eventType !== 'R');
    if (eventType !== 'R') {
      fastestLapToggle.checked = false;
      fastestLapDriver.value = '';
    }

    const existingPositions = resultData ? resultData.positions || [] : [];
    const resultTrack = document.getElementById('result-track');
    const driverOptions = this.driverOptionsMarkup();

    const cards = Array.from({ length: positionCount }, (_, index) => {
      const positionNumber = index + 1;
      const existingPosition = existingPositions.find((entry) => Number(entry.position) === positionNumber) || {};
      const driverValue = existingPosition.driverId || '';
      const lapValue = existingPosition.laptime || '';
      const dnfChecked = existingPosition.dnf ? 'checked' : '';

      return `
        <div class="position-card">
          <h4>Position ${positionNumber}</h4>
          <div class="field-group">
            <label>Driver</label>
            <select id="pos-driver-${positionNumber}">${driverOptions.replace('<option value="">No drivers added</option>', '<option value="">Select a driver</option>')}</select>
          </div>
          <div class="field-group">
            <label>Laptime</label>
            <input id="pos-lap-${positionNumber}" type="text" value="${this.escapeAttribute(lapValue)}" placeholder="1:36.123" />
          </div>
          <label><input id="pos-dnf-${positionNumber}" type="checkbox" ${dnfChecked} /> DNF</label>
        </div>
      `;
    }).join('');

    document.getElementById('result-positions').innerHTML = cards;
    Array.from({ length: positionCount }, (_, index) => {
      const positionNumber = index + 1;
      const existingPosition = existingPositions.find((entry) => Number(entry.position) === positionNumber) || {};
      const driverSelector = document.getElementById(`pos-driver-${positionNumber}`);
      if (driverSelector) {
        driverSelector.value = existingPosition.driverId || '';
      }
    });

    if (resultData && resultData.fastestLapDriverId) {
      fastestLapDriver.value = resultData.fastestLapDriverId;
    }

    if (resultTrack.value && !resultData) {
      resultTrack.value = resultTrack.value;
    }
  },

  async saveResult() {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const trackId = document.getElementById('result-track').value;
    const date = document.getElementById('result-date').value;
    const eventType = document.getElementById('result-event-type').value;

    if (!trackId || !date) {
      this.showMessage('Track and date are required.', true);
      return;
    }

    const positions = [];
    const positionCount = eventType === 'R' ? 10 : eventType === 'SR' ? 8 : 3;

    for (let positionNumber = 1; positionNumber <= positionCount; positionNumber += 1) {
      const driverSelector = document.getElementById(`pos-driver-${positionNumber}`);
      const lapInput = document.getElementById(`pos-lap-${positionNumber}`);
      const dnfInput = document.getElementById(`pos-dnf-${positionNumber}`);
      const driverId = driverSelector ? driverSelector.value : '';
      const laptime = lapInput ? lapInput.value.trim() : '';
      const dnf = dnfInput ? dnfInput.checked : false;

      if (!driverId && !dnf) continue;
      positions.push({
        position: dnf ? null : positionNumber,
        driverId,
        laptime,
        dnf
      });
    }

    const fastestLapDriverId = eventType === 'R' ? document.getElementById('result-fastest-lap-driver').value || null : null;
    const fastestLapAwarded = eventType === 'R' && document.getElementById('result-fastest-lap-toggle').checked && Boolean(fastestLapDriverId);

    const result = {
      id: state.resultEditId || this.generateId(),
      trackId,
      date,
      eventType,
      positions,
      fastestLapDriverId,
      fastestLapAwarded
    };

    const results = [...(season.results || [])];
    const index = results.findIndex((entry) => entry.id === result.id);
    if (index >= 0) {
      results[index] = result;
    } else {
      results.push(result);
    }

    await this.updateSeasonDocument({ results });
    this.resetResultForm();
    this.showMessage('Result saved.');
  },

  async deleteResult(resultId) {
    if (!this.ensureUserSignedIn()) return;
    const season = this.getSeasonData();
    const result = (season.results || []).find((entry) => entry.id === resultId);
    if (!result) return;
    if (!window.confirm(`Delete this ${result.eventType} result?`)) return;

    const results = (season.results || []).filter((entry) => entry.id !== resultId);
    await this.updateSeasonDocument({ results });
    this.showMessage('Result deleted.');
  },

  async updateSeasonDocument(updatedValues) {
    if (!state.activeSeasonId) {
      this.showMessage('No active season selected.', true);
      return;
    }
    await firebase.firestore().collection('seasons').doc(state.activeSeasonId).update(updatedValues);
  },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      this.showMessage('Email and password are required.', true);
      return;
    }

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      this.closeLoginModal();
      this.showMessage('Logged in successfully.');
    } catch (error) {
      this.showMessage(error.message || 'Login failed.', true);
    }
  },

  async forgotPassword() {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      this.showMessage('Enter your email address before requesting a password reset.', true);
      return;
    }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      this.showMessage('Password reset email sent.');
    } catch (error) {
      this.showMessage(error.message || 'Password reset failed.', true);
    }
  },

  async logout() {
    await firebase.auth().signOut();
    this.showMessage('Logged out.');
  },

  openLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
  },

  closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('login-form').reset();
  },

  ensureUserSignedIn() {
    if (!state.currentUser) {
      this.showMessage('Please log in to edit the season.', true);
      this.openLoginModal();
      return false;
    }
    return true;
  },

  showMessage(message, isError = false) {
    const banner = document.getElementById('message-banner');
    banner.textContent = message;
    banner.classList.remove('hidden');
    banner.style.borderColor = isError ? 'rgba(255, 92, 92, 0.4)' : 'var(--border)';
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, 2500);
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  escapeAttribute(value) {
    return this.escapeHtml(value).replace(/`/g, '&#96;');
  },

  generateId() {
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
