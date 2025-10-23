---
timestamp: 'Thu Oct 23 2025 02:03:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_020350.5ba45882.md]]'
content_id: 43a0f1a309c50ae58c9d2b07eb4e99b044f348bf902522adc53db152f5c05467
---

# response:

```typescript
// file: src/concepts/LikertSurvey/LikertSurveyConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * concept LikertSurvey [User, Item]
 *
 * purpose collect structured feedback from users on a set of items using a predefined, ordered scale to enable quantitative analysis of opinions.
 *
 * principle If a Likert survey is created with a name, an ordered scale (e.g., "Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree") and a set of items,
 * and a user submits ratings for some of these items using options from the defined scale, then the system can provide aggregated average rating values for each item,
 * reflecting collective sentiment.
 */

// Declare collection prefix, use concept name
const PREFIX = "LikertSurvey" + ".";

// Generic types of this concept
type User = ID;
type Item = ID;
type Survey = ID;

/**
 * a set of Surveys with
 *   a name String
 *   a scale list of String (ordered options, e.g., ["SD", "D", "N", "A", "SA"])
 */
interface SurveyDoc {
  _id: Survey;
  name: string;
  scale: string[]; // Ordered list of options
}

/**
 * a set of SurveyItems with
 *   a survey Survey
 *   an item Item
 */
interface SurveyItemDoc {
  _id: ID; // Unique ID for this association
  surveyId: Survey;
  itemId: Item;
}

/**
 * a set of Ratings with
 *   a survey Survey
 *   an item Item
 *   a user User
 *   a rating String (one of the scale options)
 */
interface RatingDoc {
  _id: ID; // Unique ID for this rating, though (surveyId, itemId, userId) forms a natural key
  surveyId: Survey;
  itemId: Item;
  userId: User;
  ratingOption: string; // Must be one of the scale options
}

export default class LikertSurveyConcept {
  private surveys: Collection<SurveyDoc>;
  private surveyItems: Collection<SurveyItemDoc>;
  private ratings: Collection<RatingDoc>;

  constructor(private readonly db: Db) {
    this.surveys = this.db.collection(PREFIX + "surveys");
    this.surveyItems = this.db.collection(PREFIX + "surveyItems");
    this.ratings = this.db.collection(PREFIX + "ratings");
  }

  /**
   * createSurvey (name: String, scale: List<String>): (survey: Survey)
   *
   * **requires** no Survey with the given 'name' already exists; 'scale' is not empty and contains unique options
   *
   * **effects** creates a new Survey 's'; sets the name of 's' to 'name' and its scale to 'scale'; returns 's' as 'survey'
   */
  async createSurvey(
    { name, scale }: { name: string; scale: string[] },
  ): Promise<{ survey: Survey } | { error: string }> {
    // Check if a survey with the given name already exists
    const existingSurvey = await this.surveys.findOne({ name });
    if (existingSurvey) {
      return { error: `Survey with name '${name}' already exists.` };
    }

    // Check if scale is not empty
    if (!scale || scale.length === 0) {
      return { error: "Scale cannot be empty." };
    }

    // Check if scale options are unique
    if (new Set(scale).size !== scale.length) {
      return { error: "Scale options must be unique." };
    }

    const newSurveyId = freshID();
    const newSurvey: SurveyDoc = {
      _id: newSurveyId,
      name,
      scale,
    };

    await this.surveys.insertOne(newSurvey);
    return { survey: newSurveyId };
  }

  /**
   * addItemToSurvey (survey: Survey, item: Item): Empty
   *
   * **requires** 'survey' exists; 'item' is not already associated with 'survey'
   *
   * **effects** associates 'item' with 'survey' in the SurveyItems state
   */
  async addItemToSurvey(
    { survey, item }: { survey: Survey; item: Item },
  ): Promise<Empty | { error: string }> {
    // Check if survey exists
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID '${survey}' not found.` };
    }

    // Check if item is already associated with the survey
    const existingSurveyItem = await this.surveyItems.findOne({
      surveyId: survey,
      itemId: item,
    });
    if (existingSurveyItem) {
      return {
        error: `Item '${item}' is already associated with survey '${survey}'.`,
      };
    }

    const newSurveyItem: SurveyItemDoc = {
      _id: freshID(), // Unique ID for the association
      surveyId: survey,
      itemId: item,
    };

    await this.surveyItems.insertOne(newSurveyItem);
    return {};
  }

  /**
   * submitRating (survey: Survey, item: Item, user: User, rating: String): Empty
   *
   * **requires** 'survey' exists; 'item' is associated with 'survey'; 'user' exists (implicitly via ID); 'rating' is one of the valid options in 'survey''s scale
   *
   * **effects** if a rating for (survey, item, user) already exists, it is updated to 'rating'; otherwise, a new rating is recorded for (survey, item, user) with 'rating'
   */
  async submitRating(
    { survey, item, user, rating }: {
      survey: Survey;
      item: Item;
      user: User;
      rating: string;
    },
  ): Promise<Empty | { error: string }> {
    // Check if survey exists
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID '${survey}' not found.` };
    }

    // Check if item is associated with the survey
    const existingSurveyItem = await this.surveyItems.findOne({
      surveyId: survey,
      itemId: item,
    });
    if (!existingSurveyItem) {
      return {
        error: `Item '${item}' is not associated with survey '${survey}'.`,
      };
    }

    // Check if rating is one of the valid scale options
    if (!existingSurvey.scale.includes(rating)) {
      return {
        error:
          `Rating '${rating}' is not a valid option for survey '${survey}'. Valid options: ${
            existingSurvey.scale.join(", ")
          }`,
      };
    }

    // Upsert the rating
    const filter = { surveyId: survey, itemId: item, userId: user };
    const update = { $set: { ratingOption: rating } };
    const options = { upsert: true, new: true }; // 'new: true' returns the modified document after update

    await this.ratings.updateOne(filter, update, options);
    return {};
  }

  /**
   * _getSurveyByName (name: String): (survey: Survey, scale: List<String>)
   *
   * **requires** 'name' corresponds to an existing survey
   *
   * **effects** returns the 'survey' and its 'scale'
   */
  async _getSurveyByName(
    { name }: { name: string },
  ): Promise<
    Array<{ survey: Survey; scale: string[] }> | { error: string }
  > {
    const surveyDoc = await this.surveys.findOne({ name });
    if (!surveyDoc) {
      return { error: `Survey with name '${name}' not found.` };
    }
    return [{ survey: surveyDoc._id, scale: surveyDoc.scale }];
  }

  /**
   * _getSurveyItems (survey: Survey): (item: Item)[]
   *
   * **requires** 'survey' exists
   *
   * **effects** returns a list of all 'item's associated with 'survey'
   */
  async _getSurveyItems(
    { survey }: { survey: Survey },
  ): Promise<Array<{ item: Item }> | { error: string }> {
    // Check if survey exists
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID '${survey}' not found.` };
    }

    const items = await this.surveyItems.find({ surveyId: survey }).toArray();
    return items.map((si) => ({ item: si.itemId }));
  }

  /**
   * _getSurveyResults (survey: Survey): (item: Item, averageRatingValue: Number, totalRatings: Number)[]
   *
   * **requires** 'survey' exists and has a defined scale
   *
   * **effects** calculates an average numeric rating for each 'item' within 'survey' based on its 'scale' (assigning 0 to N-1 values for scale options);
   * returns a list of items with their average rating value and total number of ratings
   */
  async _getSurveyResults(
    { survey }: { survey: Survey },
  ): Promise<
    Array<{ item: Item; averageRatingValue: number; totalRatings: number }> | {
      error: string;
    }
  > {
    const surveyDoc = await this.surveys.findOne({ _id: survey });
    if (!surveyDoc) {
      return { error: `Survey with ID '${survey}' not found.` };
    }
    if (!surveyDoc.scale || surveyDoc.scale.length === 0) {
      return { error: `Survey '${survey}' has no defined scale.` };
    }

    // Create a mapping from scale option string to its numeric value (0 to N-1)
    const scaleValueMap: { [key: string]: number } = {};
    surveyDoc.scale.forEach((option, index) => {
      scaleValueMap[option] = index;
    });

    const surveyItems = await this.surveyItems.find({ surveyId: survey })
      .toArray();
    const results: Array<{
      item: Item;
      averageRatingValue: number;
      totalRatings: number;
    }> = [];

    for (const surveyItem of surveyItems) {
      const itemRatings = await this.ratings.find({
        surveyId: survey,
        itemId: surveyItem.itemId,
      }).toArray();

      if (itemRatings.length > 0) {
        let sumRatingValues = 0;
        for (const rating of itemRatings) {
          sumRatingValues += scaleValueMap[rating.ratingOption];
        }
        const averageRatingValue = sumRatingValues / itemRatings.length;
        results.push({
          item: surveyItem.itemId,
          averageRatingValue,
          totalRatings: itemRatings.length,
        });
      } else {
        // Include items with no ratings, possibly with a default or null average
        results.push({
          item: surveyItem.itemId,
          averageRatingValue: NaN, // or 0, or specific default
          totalRatings: 0,
        });
      }
    }

    return results;
  }
}
```
