import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// method to generate access and refresh tokens
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateRefreshToken();
    const refreshToken = user.generateAccessToken();

    // saving in the database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access  and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // 1.GET THE USER DETAILS FROM FRONTEND
  // 2.VALIDATION - NOT EMPTY
  // 3.CHECK IF USER ALREADY EXISTS - USERNAME OR EMAIL
  // 4.CHECK FOR IMAGE AND AVATAR
  // 5.UPLOAD THEM TO CLOUDINARY , AVATAR
  // 6.CREATE USER OBJECT - CREATE ENTRY IN DATABASE
  // 7.REMOVE THE PASSWORD AND REFRESH TOKEN FIELD FROM RESPONSE
  // 8.CHECK FOR USER CREATION
  // 9.RETURN RESPONSE

  // 1
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);

  // 2
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "ALL FIELD ARE REQUIRED");
  }

  // 3
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    ApiError(409, "User with email or username already exists");
  }

  // console.log(req.files);

  // 4
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverimageLocalPath = req.files?.coverimage[0]?.path;

  let coverimageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverimage) &&
    req.files.coverimage.length > 0
  ) {
    coverimageLocalPath = req.files.coverimage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // 5
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverimage = await uploadOnCloudinary(coverimageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar on cloudinary");
  }

  // 6
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  // 7
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 8
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  // 9
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // 1. req body -> data
  // 2. username or email
  // 3. find user in db
  // 4. validate password
  // 5. access and refresh generate token
  // 6. send token in response or cookie

  // 1
  const { email, password, username } = req.body;

  // 2

  if (!username || !email) {
    throw new ApiError(400, "Email or username are required");
  }

  // 3
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "Invalid user");
  }

  // 4
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // 5
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // 6
  const loggedInUser = await User.findById(user._id).select(
    " -password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {});

export { registerUser, loginUser, logoutUser };
