(function () {
	'use strict';

	const $ = document.querySelector.bind(document);
	const $$ = document.querySelectorAll.bind(document);
	Node.prototype.on = Node.prototype.addEventListener;

	// iife standing in for real modules
	const config = (function () {
		return {
			API_URL: 'http://taco-randomizer.herokuapp.com'
		};
	}());


	const apiService = (function () {
		
		const baseUrl = config.API_URL;

		// /base_layers
		// /mixins
		// /seasonings
		// /condiments
		// /shells

		function getBaseLayers() {
			return axios.get(`${baseUrl}/base_layers/`);
		}

		function getMixins() {
			return axios.get(`${baseUrl}/mixins/`);
		}

		function getSeasonings() {
			return axios.get(`${baseUrl}/seasonings/`);
		}

		function getCondiments() {
			return axios.get(`${baseUrl}/condiments/`);
		}

		function getShells() {
			return axios.get(`${baseUrl}/shells/`);
		}

		return {
			getBaseLayers,
			getMixins,
			getSeasonings,
			getCondiments,
			getShells
		};

	}());

	let ItemSelector = {
		props: ['name', 'items', 'multiple'],
		template: `
			<div class="field">
				<label class="label">{{ name }}</label>
				<div class="control">
					<div class="control">
						<div class="select" :class="{ 'is-multiple': multiple }">
							<select @change="onChange($event.target.value)" ref="selector">
								<option v-for="item in items" :value="item.slug">{{ item.name }}</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		`,
		// There has got to be a better way to do this
		// https://stackoverflow.com/a/41682086/2486583
		mounted() {
			if (this.multiple) {
				this.$refs.selector.setAttribute('multiple', true);
			}
		},
		methods: {
			onChange(v) {
				if (this.multiple) {
					// https://stackoverflow.com/a/39363742/2486583
					this.$emit('item-selected', Array.from(this.$refs.selector.options).filter(opt => opt.selected).map(opt => opt.value));
				} else {
					this.$emit('item-selected', v);
				}
			}
		}
	};

	let OrderDisplay = {
		props: ['order', 'shells', 'baseLayers', 'mixins', 'condiments', 'seasonings'],
		template: `
			<div class="tile is-child notification is-light">
				<p><strong>{{ theBaseLayer }}</strong>
				with <strong>{{ theMixins }}</strong>,
				garnished with <strong>{{ theCondiments }}</strong>
				topped off with <strong>{{ theSeasonings }}</strong>
				and wrapped in delicious <strong>{{ theShell }}</strong>.</p>
				<span class="link" @click="remove">Delete</span>
			</div>
		`,
		computed: {
			theShell() {
				return idToName(this.order.shell, 'slug', this.shells);
			},
			theBaseLayer() {
				return idToName(this.order.baseLayer, 'slug', this.baseLayers);
			},
			theMixins() {
				return makeSentence(this.order.mixins, this.mixins);
			},
			theCondiments() {
				return makeSentence(this.order.condiments, this.condiments);
			},
			theSeasonings() {
				return makeSentence(this.order.seasonings, this.seasonings);
			},
		},
		methods: {
			remove() {
				this.$emit('delete-order', this.order.id);
			}
		}
	};

	function idToName(id, idProp, arr) {
		if (id) {
			return arr.find(el => id === el[idProp]).name;
		}
	}

	function sentencify(el, i, arr) {
		switch (arr.length) {
			case 1:
				return el;
				break;
			case 2:
				return i === (arr.length - 1) ? ' and ' + el : el;
				break;
			default:
				return i === (arr.length - 1) ? ' and ' + el : el + ',';
				break;
		}
	}


	function makeSentence(arr, collec) {
		return arr.map(slug => idToName(slug, 'slug', collec))
			.map(sentencify)
			.join(' ');
	}

	function isEmpty(arr) {
		return arr.length === 0;
	}

	let app = new Vue({
		el: '#app',
		data: {
			loading: false,

			shells: [],
			baseLayers: [],
			mixins: [],
			condiments: [],
			seasonings: [],

			selectedShell: null,
			selectedBaseLayer: null,
			selectedMixins: [],
			selectedCondiments: [],
			selectedSeasonings: [],
			orders: []
		},
		computed: {
			orderValid() {
				return this.selectedShell && 
					this.selectedBaseLayer && 
					!isEmpty(this.selectedMixins) &&
					!isEmpty(this.selectedSeasonings) &&
					!isEmpty(this.selectedCondiments)
			}
		},
		components: {
			'app-item-selector': ItemSelector,
			'app-order-display': OrderDisplay
		},
		created() {
			this.loading = true;
			Promise.all([
				apiService.getBaseLayers(),
				apiService.getMixins(),
				apiService.getSeasonings(),
				apiService.getCondiments(),
				apiService.getShells()
			]).then(resps => {
				console.log(resps);
				this.loading = false;
				['baseLayers', 'mixins', 'seasonings', 'condiments', 'shells'].map((el, i) => {
					this[el] = resps[i].data;
				});
				this.reset();
			}).catch(err => {
				console.error(err);
				this.loading = false;
			});
		},
		methods: {
			setItem(item, slug) {
				// console.log('setitem')
				this['selected' + item] = slug;
			},
			addOrder() {
				this.orders.push({
					id: window.nanoid(),
					shell: this.selectedShell,
					baseLayer: this.selectedBaseLayer,
					mixins: this.selectedMixins,
					condiments: this.selectedCondiments,
					seasonings: this.selectedSeasonings
				});
				// this.reset();
			},
			deleteOrder(id) {
				let i = this.orders.find(o => o.id === id);
				this.orders.splice(i, 1);
				// this.reset() // doesn't currently work because of how we're handling multi-selects
			},
			reset() {
				this.selectedShell = this.shells[0].slug;
				this.selectedBaseLayer = this.baseLayers[0].slug;
				this.selectedMixins = [];
				this.selectedCondiments = [];
				this.selectedSeasonings = [];
			}
		}
	});


}());