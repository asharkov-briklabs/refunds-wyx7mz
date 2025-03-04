/**
 * @file Exports the common page components used across both Pike (merchant) and Barracuda (admin) interfaces,
 * including error pages, authentication pages, and other shared UI components.
 */

// IE1: Import all common pages like Error, Login, NotFound, and Unauthorized pages
import * as CommonPages from './common';
// IE1: Import all Pike (merchant-facing) pages
import * as PikePages from './pike';
// IE1: Import all Barracuda (admin-facing) pages
import * as BarracudaPages from './barracuda';

// IE3: Re-export all common pages
export * from './common';

// IE3: Re-export all Pike pages
export * from './pike';

// IE3: Re-export all Barracuda pages
export * from './barracuda';