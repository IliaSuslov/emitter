/* Check the comments first */

import { EventEmitter } from "./emitter";
import { EVENT_SAVE_DELAY_MS, EventDelayedRepository, EventRepositoryError } from "./event-repository";
import { EventStatistics } from "./event-statistics";
import { ResultsTester } from "./results-tester";
import { triggerRandomly } from "./utils";

const MAX_EVENTS = 1000;

enum EventName {
  EventA = "A",
  EventB = "B",
}

const EVENT_NAMES = [EventName.EventA, EventName.EventB];

/*

  An initial configuration for this case

*/

function init() {
  const emitter = new EventEmitter<EventName>();

  triggerRandomly(() => emitter.emit(EventName.EventA), MAX_EVENTS);
  triggerRandomly(() => emitter.emit(EventName.EventB), MAX_EVENTS);

  const repository = new EventRepository();
  const handler = new EventHandler(emitter, repository);

  const resultsTester = new ResultsTester({
    eventNames: EVENT_NAMES,
    emitter,
    handler,
    repository,
  });
  resultsTester.showStats(20);

}

/* Please do not change the code above this line */
/* ----–––––––––––––––––––––––––––––––––––––---- */

/*

  The implementation of EventHandler and EventRepository is up to you.
  Main idea is to subscribe to EventEmitter, save it in local stats
  along with syncing with EventRepository.

*/

class EventHandler extends EventStatistics<EventName> {
  // Feel free to edit this class

  repository: EventRepository;

  constructor(emitter: EventEmitter<EventName>, repository: EventRepository) {
    super();
    this.repository = repository;

    EventName: [EventName.EventA, EventName.EventB].forEach(eventName =>
      emitter.subscribe(eventName, () => this.saveEventData(eventName, 1)))
  }

  saveEventData(eventName: EventName, i: number) {
    this.repository.saveEventData(eventName, i);
    this.setStats(eventName, (this.getStats(eventName) || 0) + 1);
  }
}

class EventRepository extends EventDelayedRepository<EventName> {
  // Feel free to edit this class
  private last: number = 0;
  private cacheEvent: Map<EventName, number> = new Map();

  async saveEventData(eventName: EventName, i: number) {

    const acum = (this.cacheEvent.get(eventName) || 0) + i;

    const now = new Date().getTime();
    if (now < this.last + EVENT_SAVE_DELAY_MS) {
      this.cacheEvent.set(eventName, acum);
      return
    }
    this.last = now;
    this.cacheEvent.set(eventName, 0);

    try {
      await this.updateEventStatsBy(eventName, acum);
    } catch (err) {
      switch (err) {
        case EventRepositoryError.TOO_MANY: this.saveEventData(eventName, acum);
        case EventRepositoryError.REQUEST_FAIL: this.saveEventData(eventName, acum);
        case EventRepositoryError.RESPONSE_FAIL:
      }
      // const _error = e as EventRepositoryError;
      // console.warn(error);
    }
  }
}

init();
