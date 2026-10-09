import { Component, signal } from '@angular/core'

import { At } from './@scoped/at.component'
import { Card } from './card.component'
import { DuoFirst, DuoSecond } from './duo.component'
import { InlineCard } from './inline-card.component'
import { Io } from './io.component'
import { Lab } from './lab.component'
import { UTIL_VALUE } from './util'

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [Card, InlineCard, DuoFirst, DuoSecond, Lab, Io, At],
})
export class App {
  protected readonly title = signal('E2E_TITLE')
  protected readonly utilValue = UTIL_VALUE
  protected readonly ioClicked = signal('')
  protected readonly ioRenamed = signal(0)
  protected readonly ioChecked = signal(false)
}
